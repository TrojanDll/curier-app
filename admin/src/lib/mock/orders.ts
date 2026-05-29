import type { Order, OrderStatus } from "@/types/order";

const ADMIN_ID = "a1";

const NAMES = [
    "Анна Смирнова",
    "Михаил Кузнецов",
    "Елена Попова",
    "Дмитрий Соколов",
    "Ольга Лебедева",
    "Алексей Морозов",
    "Светлана Новикова",
    "Сергей Волков",
    "Татьяна Зайцева",
    "Игорь Павлов",
    "Наталья Семенова",
    "Андрей Голубев",
];

const ADDRESSES = [
    "ул. Ленина, д. 12, кв. 45",
    "пр. Победы, д. 78, кв. 12",
    "ул. Гагарина, д. 5, кв. 7",
    "ул. Советская, д. 33, кв. 89",
    "пр. Мира, д. 101, кв. 3",
    "ул. Пушкина, д. 22, кв. 15",
    "ул. Чехова, д. 14, кв. 56",
    "пр. Космонавтов, д. 47, кв. 28",
    "ул. Толстого, д. 9, кв. 4",
    "ул. Дзержинского, д. 18, кв. 71",
];

const PRODUCTS = [
    "Букет роз 25 шт",
    "Торт «Наполеон» 2 кг",
    "Документы (конверт А4)",
    "Цветы — пионы 15 шт",
    "Пицца «Маргарита» x2",
    "Книги (3 шт)",
    "Подарочный набор",
    "Лекарства из аптеки",
    "Ключи + конверт",
    "Цветочная композиция",
];

const PHONES = [
    "+7 901 111-22-33",
    "+7 902 222-33-44",
    "+7 903 333-44-55",
    "+7 904 444-55-66",
    "+7 905 555-66-77",
    "+7 906 666-77-88",
    "+7 907 777-88-99",
    "+7 908 888-99-00",
    "+7 909 999-00-11",
    "+7 910 000-11-22",
];

interface ScenarioStep {
    status: OrderStatus;
    /** Через сколько часов от createdAt поставлен этот статус. */
    afterHours: number;
}

interface OrderScenario {
    status: OrderStatus;
    courierIndex: number | null;
    history: ScenarioStep[];
}

/**
 * Сценарии заказов: разные статусы и разное распределение по курьерам,
 * чтобы UI имел репрезентативные данные для фильтров и сортировок.
 */
const SCENARIOS: OrderScenario[] = [
    { status: "new", courierIndex: null, history: [] },
    { status: "new", courierIndex: null, history: [] },
    { status: "assigned", courierIndex: 0, history: [{ status: "assigned", afterHours: 0.1 }] },
    {
        status: "picked_up",
        courierIndex: 1,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.5 },
        ],
    },
    {
        status: "near_customer",
        courierIndex: 0,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.6 },
            { status: "near_customer", afterHours: 1.2 },
        ],
    },
    {
        status: "delivered",
        courierIndex: 1,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.5 },
            { status: "near_customer", afterHours: 1 },
            { status: "delivered", afterHours: 1.4 },
        ],
    },
    {
        status: "returned",
        courierIndex: 1,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.5 },
            { status: "near_customer", afterHours: 1 },
            { status: "delivered", afterHours: 1.4 },
            { status: "returned", afterHours: 2 },
        ],
    },
    {
        status: "delivered",
        courierIndex: 0,
        history: [
            { status: "assigned", afterHours: 0.2 },
            { status: "picked_up", afterHours: 0.7 },
            { status: "near_customer", afterHours: 1.3 },
            { status: "delivered", afterHours: 1.8 },
        ],
    },
    {
        status: "assigned",
        courierIndex: 3,
        history: [{ status: "assigned", afterHours: 0.05 }],
    },
    {
        status: "picked_up",
        courierIndex: 3,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.6 },
        ],
    },
    { status: "new", courierIndex: null, history: [] },
    {
        status: "delivered",
        courierIndex: 0,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.5 },
            { status: "near_customer", afterHours: 1 },
            { status: "delivered", afterHours: 1.5 },
        ],
    },
    {
        status: "returned",
        courierIndex: 0,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.5 },
            { status: "near_customer", afterHours: 1 },
            { status: "delivered", afterHours: 1.5 },
            { status: "returned", afterHours: 2.2 },
        ],
    },
    {
        status: "delivered",
        courierIndex: 1,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.5 },
            { status: "near_customer", afterHours: 1 },
            { status: "delivered", afterHours: 1.5 },
        ],
    },
    {
        status: "near_customer",
        courierIndex: 3,
        history: [
            { status: "assigned", afterHours: 0.1 },
            { status: "picked_up", afterHours: 0.6 },
            { status: "near_customer", afterHours: 1.1 },
        ],
    },
];

function pad(n: number, width = 4): string {
    return String(n).padStart(width, "0");
}

function pickIndex(seed: number, length: number): number {
    return seed % length;
}

/**
 * Помощник для индексированного доступа: рассчитан на массивы константной
 * длины и валидный seed, поэтому non-null assert безопасен.
 */
function pick<T>(arr: readonly T[], seed: number): T {
    const value = arr[pickIndex(seed, arr.length)];
    if (value === undefined) {
        throw new Error("pick(): индекс выходит за границы массива");
    }
    return value;
}

function isoOffsetHours(baseIso: string, hours: number): string {
    const date = new Date(baseIso);
    date.setMinutes(date.getMinutes() + Math.round(hours * 60));
    return date.toISOString();
}

const NOW = new Date("2026-04-25T11:00:00Z").getTime();

/**
 * Генерируем стабильный (по индексу) набор моковых заказов.
 * Стабильность важна, чтобы при ре-рендерах не «прыгали» строки таблицы.
 */
export const MOCK_ORDERS: Order[] = SCENARIOS.map((scenario, index) => {
    const seed = index + 1;
    const createdAt = new Date(NOW - (SCENARIOS.length - index) * 90 * 60 * 1000).toISOString();
    const customerName = pick(NAMES, seed * 3);
    const phone = pick(PHONES, seed * 5);
    const address = pick(ADDRESSES, seed * 7);
    const product = pick(PRODUCTS, seed * 11);
    const courierId = scenario.courierIndex === null ? null : `c${scenario.courierIndex + 1}`;

    const stepMap = new Map<OrderStatus, string>();
    for (const step of scenario.history) {
        stepMap.set(step.status, isoOffsetHours(createdAt, step.afterHours));
    }

    return {
        id: `o${seed}`,
        orderNumber: `ORD-2026-${pad(seed)}`,
        customerName,
        customerPhone: phone,
        deliveryAddress: address,
        productDescription: product,
        comments: seed % 3 === 0 ? "Позвонить за 15 минут до приезда" : null,
        price: 800 + (seed * 137) % 4200,
        status: scenario.status,
        priority: seed % 5 === 0 ? "high" : seed % 7 === 0 ? "low" : "normal",
        courierId,
        createdByAdminId: ADMIN_ID,
        createdAt,
        assignedAt: stepMap.get("assigned") ?? null,
        pickedUpAt: stepMap.get("picked_up") ?? null,
        nearCustomerAt: stepMap.get("near_customer") ?? null,
        deliveredAt: stepMap.get("delivered") ?? null,
        returnedAt: stepMap.get("returned") ?? null,
        photos: [],
    } satisfies Order;
});
