// Mantém paridade com ProductCategory do backend.
export const PRODUCT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'BOLOS', label: 'Bolos' },
  { value: 'MINI_BABY', label: 'Mini e Baby' },
  { value: 'BITES', label: 'Bites' },
  { value: 'RECHEADOS', label: 'Bolos Recheados' },
  { value: 'CASEIRO_POTE', label: 'Bolo Caseiro no Pote' },
  { value: 'GELADOS', label: 'Gelados' },
  { value: 'CUCAS_TORTAS', label: 'Cucas e Tortas' },
  { value: 'COBERTURAS', label: 'Coberturas' },
  { value: 'ESPECIAIS', label: 'Bolos Especiais' },
  { value: 'ACESSORIOS', label: 'Acessórios' },
];

export function categoryLabel(value: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// Rótulos amigáveis para os menuOption gravados em interaction_logs.
const MENU_LABELS: Record<string, string> = {
  MAIN_MENU: 'Menu principal',
  PEDIDOS: 'Fazer pedido',
  DUVIDAS: 'Dúvidas / horários',
  OPTIN_SIM: 'Aceitou promoções',
  OPTIN_NAO: 'Recusou promoções',
};

export function menuLabel(code: string): string {
  if (!code) return '—';
  if (MENU_LABELS[code]) return MENU_LABELS[code];
  if (code.startsWith('CAT_')) return 'Categoria: ' + categoryLabel(code.slice(4));
  return code;
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
