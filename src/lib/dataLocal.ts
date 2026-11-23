export function obterDataHojeSP(): string {
  // 'en-CA' retorna exatamente no formato YYYY-MM-DD respeitando o fuso de São Paulo
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  })
}
