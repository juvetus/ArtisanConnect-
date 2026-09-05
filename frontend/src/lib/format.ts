/** Le franc CFA n'a pas de subdivision : les montants sont toujours des entiers. */
export function formatXAF(amount: number | string) {
  const value = Math.round(Number(amount));
  return `${value.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}
