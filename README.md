# Sistema de Fiscalização Operacional de Rua

Aplicação web desenvolvida para acompanhamento diário e fiscalização presencial de equipes externas de conservação urbana (varrição, capina, roçada e pintura).

## Funcionalidades Atuais

* **Seleção de Setor:** Listagem e troca rápida de setor de trabalho (Conserv).
* **Gestão de Equipes por Conserv:** Exibição dos funcionários ativos alocados no setor selecionado.
* **Filtros de Campo:**
  * Busca textual por nome ou empresa em tempo real.
  * Filtro por função exercida (varredor, pintor, roçador, etc.).
  * Filtro rápido de status diário: Todos, Pendentes e Auditados.
  * Barra de progresso visual de fiscalização do dia.
* **Ficha de Fiscalização:**
  * Verificação do uso adequado de Equipamentos de Proteção Individual (EPI).
  * Apontamento de status individual: Presente, Falta, Folga, Férias, INSS, Cedido e Outros.
  * Campo obrigatório para detalhamento de destino/motivo ao selecionar Cedido ou Outros.
  * Botão de confirmação explícito antes de gravar para evitar erros de toque em campo.
* **Indicadores Visuais:** Identificação imediata na lista de quem já foi auditado e o respectivo status atribuído hoje.
* **Histórico e Relatórios:**
  * Painel de consulta de fiscalizações filtrado por data e setor.
  * Exportação de dados consolidados em formato CSV (compatível com Excel).

## Tecnologias Utilizadas

* **Frontend:** React, TypeScript, Vite, Tailwind CSS.
* **Backend e Banco de Dados:** Supabase (PostgreSQL, Realtime, Auth).

## Como Rodar o Projeto

1. Clone o repositório e instale as dependências:
  ```bash
    npm install
  ```

2. Crie o arquivo .env.local na raiz com as chaves do Supabase:
  ```bash
    VITE_SUPABASE_URL=https://seu-projeto.supabase.co
    VITE_SUPABASE_ANON_KEY=sua-chave-anonima
  ```
3. Inicie o servidor local:
  ```bash
    npm run dev
  ```

4. Para testar em dispositivos móveis na mesma rede Wi-Fi:
  ```bash
    npm run dev -- --host
  ```