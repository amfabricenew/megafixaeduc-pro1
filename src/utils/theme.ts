export const LOGO_COLORS = {
  primary: '#013efb',   // Bleu Royal du logo
  secondary: '#fb5c03', // Orange Vif du logo
  accent: '#049ffb',    // Bleu Ciel / Cyan du logo
} as const;

export const getPrimaryColor = () => {
  if (typeof window === 'undefined') return LOGO_COLORS.primary;
  return getComputedStyle(document.documentElement).getPropertyValue('--school-primary').trim() || LOGO_COLORS.primary;
};

export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [1, 62, 251];
};
