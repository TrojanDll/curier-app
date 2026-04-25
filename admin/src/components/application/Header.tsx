interface HeaderProps {
    title: string;
    description?: string;
    /** Action-зона справа (кнопки «Создать заказ», фильтры и т.п.). */
    actions?: React.ReactNode;
}

/**
 * Заголовок страницы с опциональным описанием и блоком действий.
 * Используется внутри (authenticated)/layout — каждая страница рендерит
 * собственный <Header /> со своим title.
 */
export function Header({ title, description, actions }: HeaderProps) {
    return (
        <header className="flex flex-col gap-4 border-b border-secondary bg-primary px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary">{title}</h1>
                {description ? <p className="text-sm text-tertiary">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}
