"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { orderKeys } from "./keys";
import type { Order, OrderPriority, OrderStatus, PhotoMeta } from "@/types/order";

/**
 * Контракт `GET /api/admin/orders` (см. docs/orders.md).
 *
 * NestJS отдаёт `price` строкой ("123.45"|null) — это Decimal(10,2), мы
 * сериализуем в число в mapper-е, потому что UI работает с number.
 * Точность достаточна для отображения через Intl.NumberFormat.
 */
export interface PhotoMetaDto {
    id: string;
    uploadedAt: string;
    expiresAt: string;
}

export interface OrderAdminDto {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    productDescription: string;
    comments: string | null;
    price: string | null;
    status: OrderStatus;
    priority: OrderPriority;
    courierId: string | null;
    createdByAdminId: string;
    createdAt: string;
    assignedAt: string | null;
    pickedUpAt: string | null;
    nearCustomerAt: string | null;
    deliveredAt: string | null;
    returnedAt: string | null;
    photos: PhotoMetaDto[];
}

export interface OrdersListResponseDto {
    items: OrderAdminDto[];
    total: number;
    page: number;
    pageSize: number;
}

export interface OrdersListResponse {
    items: Order[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Параметры списка заказов. Все опциональные — backend сам подставит
 * defaults (см. docs/orders.md §List query). Сериализуем только то, что
 * реально задано, иначе query-ключ react-query будет нестабильным.
 */
export interface OrdersListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: "createdAt" | "orderNumber" | "status" | "assignedAt" | "deliveredAt";
    order?: "asc" | "desc";
    /** Список статусов; пустой = "all". */
    status?: OrderStatus[];
    courierId?: string;
    from?: string;
    to?: string;
}

function mapPhoto(dto: PhotoMetaDto): PhotoMeta {
    return { id: dto.id, uploadedAt: dto.uploadedAt, expiresAt: dto.expiresAt };
}

function mapOrder(dto: OrderAdminDto): Order {
    return {
        id: dto.id,
        orderNumber: dto.orderNumber,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryAddress: dto.deliveryAddress,
        productDescription: dto.productDescription,
        comments: dto.comments,
        price: dto.price === null ? null : Number(dto.price),
        status: dto.status,
        priority: dto.priority,
        courierId: dto.courierId,
        createdByAdminId: dto.createdByAdminId,
        createdAt: dto.createdAt,
        assignedAt: dto.assignedAt,
        pickedUpAt: dto.pickedUpAt,
        nearCustomerAt: dto.nearCustomerAt,
        deliveredAt: dto.deliveredAt,
        returnedAt: dto.returnedAt,
        photos: dto.photos.map(mapPhoto),
    };
}

function buildOrdersQueryParams(query: OrdersListQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.pageSize !== undefined) params.pageSize = query.pageSize;
    if (query.search) params.search = query.search;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.order) params.order = query.order;
    if (query.status && query.status.length > 0) params.status = query.status.join(",");
    if (query.courierId) params.courierId = query.courierId;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    return params;
}

export function useOrders(query: OrdersListQuery) {
    return useQuery({
        queryKey: orderKeys.list(query),
        queryFn: async (): Promise<OrdersListResponse> => {
            const { data } = await apiClient.get<OrdersListResponseDto>("/admin/orders", {
                params: buildOrdersQueryParams(query),
            });
            return {
                items: data.items.map(mapOrder),
                total: data.total,
                page: data.page,
                pageSize: data.pageSize,
            };
        },
        placeholderData: (previous) => previous,
    });
}

export function useOrder(id: string | null) {
    return useQuery({
        queryKey: id ? orderKeys.detail(id) : orderKeys.details(),
        queryFn: async (): Promise<Order> => {
            const { data } = await apiClient.get<OrderAdminDto>(`/admin/orders/${id}`);
            return mapOrder(data);
        },
        enabled: id !== null,
    });
}

interface ReassignInput {
    orderId: string;
    courierId: string;
}

export function useReassignOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, courierId }: ReassignInput): Promise<Order> => {
            const { data } = await apiClient.post<OrderAdminDto>(
                `/admin/orders/${orderId}/reassign`,
                { courierId },
            );
            return mapOrder(data);
        },
        onSuccess: (order) => {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            queryClient.setQueryData(orderKeys.detail(order.id), order);
        },
    });
}

/**
 * Тело `POST /api/admin/orders` (см. docs/orders.md). `orderNumber`,
 * `status`, `courierId`, `createdByAdminId` и timestamps backend выставляет
 * сам; auto-assign (Stage 2.6) может вернуть уже `assigned` ответ.
 *
 * `price` — строка `"123.45"|null`, чтобы не терять точность Decimal(10,2)
 * при JSON-сериализации (см. validation.md и mapOrder выше).
 */
export interface CreateOrderInput {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    productDescription: string;
    comments?: string | null;
    price?: string | null;
    /** Срочность заказа. Не задан → backend подставит `normal`. */
    priority?: OrderPriority;
    /**
     * Если задан — заказ создаётся сразу в статусе `assigned` с этим курьером
     * (auto-assign пропускается). Backend проверяет, что курьер существует,
     * активен и не на паузе. Иначе ответит 404/409.
     */
    courierId?: string;
}

export function useCreateOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: CreateOrderInput): Promise<Order> => {
            const { data } = await apiClient.post<OrderAdminDto>("/admin/orders", input);
            return mapOrder(data);
        },
        onSuccess: (order) => {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            queryClient.setQueryData(orderKeys.detail(order.id), order);
        },
    });
}

/**
 * Назначить заказ автоматически: backend через взвешенный скоринг выберет
 * лучшего свободного курьера для приоритета заказа (простой + скорость +
 * нагрузка + опыт; см. docs/assignment.md), исключая текущего, если он есть.
 * 409, если подходящего курьера нет.
 */
export function useAutoAssignOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (orderId: string): Promise<Order> => {
            const { data } = await apiClient.post<OrderAdminDto>(
                `/admin/orders/${orderId}/auto-assign`,
            );
            return mapOrder(data);
        },
        onSuccess: (order) => {
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
            queryClient.setQueryData(orderKeys.detail(order.id), order);
        },
    });
}
