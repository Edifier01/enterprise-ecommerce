import {
  filterAdminNavSections,
  type AdminNavLink,
} from "@/lib/admin/navigation";

export type AdminCommandGroup = "search" | "navigation" | "views" | "actions";

export type AdminCommandItem = {
  id: string;
  label: string;
  description?: string;
  group: AdminCommandGroup;
  keywords?: readonly string[];
  href?: string;
  permissions?: readonly string[];
};

const GROUP_LABELS: Record<AdminCommandGroup, string> = {
  search: "Поиск",
  navigation: "Навигация",
  views: "Быстрые представления",
  actions: "Действия",
};

const QUICK_VIEWS: readonly AdminCommandItem[] = [
  {
    id: "view-low-stock",
    label: "Низкий остаток по товарам",
    description: "Склад · группировка по товару",
    group: "views",
    href: "/admin/inventory?low_stock=true&group_by=product",
    keywords: ["остаток", "склад", "stock"],
  },
  {
    id: "view-import-queue",
    label: "Очередь импорта",
    description: "Товары без категории",
    group: "views",
    href: "/admin/integrations/moysklad/import",
    permissions: ["catalog:write"],
    keywords: ["импорт", "мойсклад", "категория"],
  },
  {
    id: "view-workflow",
    label: "Оформление каталога",
    description: "Очереди merchandising",
    group: "views",
    href: "/admin/catalog/workflow",
    keywords: ["оформление", "фото", "публикация"],
  },
  {
    id: "view-needs-styling",
    label: "Требует оформления",
    description: "Без фото или черновики",
    group: "views",
    href: "/admin/catalog?needs_styling=1&all=1",
    keywords: ["черновик", "фото"],
  },
  {
    id: "view-export-pending",
    label: "Заказы без экспорта в МойСклад",
    description: "Подтверждённые, ожидают выгрузки",
    group: "views",
    href: "/admin/orders?export_pending=1",
    keywords: ["экспорт", "заказы"],
  },
];

const ACTION_COMMANDS: readonly AdminCommandItem[] = [
  {
    id: "action-pull-stock",
    label: "Обновить остатки из МойСклад",
    description: "Синхронизация склада",
    group: "actions",
    permissions: ["integrations:write"],
    keywords: ["sync", "остатки", "мойсклад"],
  },
  {
    id: "action-pull-catalog",
    label: "Импорт каталога из МойСклад",
    description: "Pull каталога и остатков",
    group: "actions",
    permissions: ["integrations:write"],
    keywords: ["импорт", "каталог"],
  },
];

const ORDER_NUMBER_PATTERN = /^ORD-\d{8}-[A-F0-9]{6}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function commandAllowed(command: AdminCommandItem, permissions: readonly string[]): boolean {
  if (!command.permissions?.length) return true;
  return command.permissions.some((permission) => permissions.includes(permission));
}

function navLinkToCommand(link: AdminNavLink): AdminCommandItem {
  return {
    id: `nav-${link.href}`,
    label: link.label,
    description: link.href,
    group: "navigation",
    href: link.href,
    permissions: link.permissions,
    keywords: [link.label.toLowerCase()],
  };
}

function buildSearchCommands(query: string, permissions: readonly string[]): AdminCommandItem[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const encoded = encodeURIComponent(trimmed);
  const commands: AdminCommandItem[] = [
    {
      id: "search-catalog",
      label: `Найти товар: «${trimmed}»`,
      description: "Каталог · название или slug",
      group: "search",
      href: `/admin/catalog?all=1&q=${encoded}`,
    },
    {
      id: "search-inventory",
      label: `Найти SKU на складе: «${trimmed}»`,
      description: "Склад · артикул или название",
      group: "search",
      href: `/admin/inventory?q=${encoded}`,
    },
    {
      id: "search-orders",
      label: `Найти заказ: «${trimmed}»`,
      description: "Список заказов",
      group: "search",
      href: `/admin/orders?q=${encoded}`,
    },
  ];

  if (ORDER_NUMBER_PATTERN.test(trimmed)) {
    commands.unshift({
      id: "open-order",
      label: `Открыть заказ ${trimmed.toUpperCase()}`,
      description: "Карточка заказа",
      group: "search",
      href: `/admin/orders/${encodeURIComponent(trimmed.toUpperCase())}`,
    });
  }

  if (EMAIL_PATTERN.test(trimmed) && permissions.includes("customers:read")) {
    commands.push({
      id: "search-customers",
      label: `Найти клиента: «${trimmed}»`,
      description: "Email покупателя",
      group: "search",
      href: `/admin/customers?q=${encoded}`,
      permissions: ["customers:read"],
    });
  }

  return commands.filter((command) => commandAllowed(command, permissions));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(command: AdminCommandItem, query: string): boolean {
  const normalized = normalize(query);
  if (!normalized) return true;

  const haystack = [command.label, command.description ?? "", ...(command.keywords ?? [])]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function getAdminCommandGroupLabel(group: AdminCommandGroup): string {
  return GROUP_LABELS[group];
}

export function buildAdminCommands(
  permissions: readonly string[],
  query = "",
): AdminCommandItem[] {
  const navigation = filterAdminNavSections(permissions).flatMap((section) =>
    section.items.map(navLinkToCommand),
  );

  const staticCommands = [
    ...navigation,
    ...QUICK_VIEWS.filter((command) => commandAllowed(command, permissions)),
    ...ACTION_COMMANDS.filter((command) => commandAllowed(command, permissions)),
  ];

  const searchCommands = buildSearchCommands(query, permissions);
  const filteredStatic = normalize(query)
    ? staticCommands.filter((command) => matchesQuery(command, query))
    : staticCommands;

  const merged = [...searchCommands, ...filteredStatic];
  const seen = new Set<string>();

  return merged.filter((command) => {
    if (seen.has(command.id)) return false;
    seen.add(command.id);
    if (command.href) return true;
    return commandAllowed(command, permissions);
  });
}

export function groupAdminCommands(
  commands: AdminCommandItem[],
): Array<{ group: AdminCommandGroup; items: AdminCommandItem[] }> {
  const order: AdminCommandGroup[] = ["search", "navigation", "views", "actions"];
  return order
    .map((group) => ({
      group,
      items: commands.filter((command) => command.group === group),
    }))
    .filter((entry) => entry.items.length > 0);
}
