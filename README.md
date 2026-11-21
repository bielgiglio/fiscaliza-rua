# Fiscaliza Rua

> Aplicação Web Progressiva (PWA) desenvolvida com abordagem *mobile-first* para fiscalização em campo de equipes operacionais terceirizadas, controle diário de assiduidade, auditoria de Equipamentos de Proteção Individual (EPI) e gestão administrativa de setores operacionais (Conservs).

---

## 📱 Operação em Campo

Na rotina de campo, os fiscais têm acesso rápido e intuitivo às equipes alocadas por região, identificando o coordenador responsável pelo setor:

- **Apontamento Diário e Ágil:** Registro de presença com status padronizados:
  - `Presente` | `Falta` | `Cedido` | `Outros` | `Folga` | `Férias` | `INSS`
- **Auditoria de EPI:** Verificação objetiva de conformidade de Equipamentos de Proteção Individual.
- **Justificativas Obrigatórias:** Preenchimento mandatório de motivo/destino ao selecionar status como *Cedido* ou *Outros*.
- **Painel e Filtros Dinâmicos:**
  - Barra de progresso com a porcentagem de conclusão da auditoria do dia.
  - Pesquisa instantânea por nome do funcionário ou empresa contratada.
  - Filtro por função exercida (ex.: varredor, roçador, pintor).
  - Alternância rápida entre operários **Pendentes** e **Auditados**.
- **Sincronização em Tempo Real (Realtime):** Atualização simultânea entre múltiplos fiscais no mesmo setor, prevenindo duplicidade de registros.
- **PWA (Progressive Web App):** Instalável diretamente na tela inicial de smartphones Android e iOS, operando em tela cheia com interface de aplicativo nativo.

---

## ⚙️ Painel Administrativo e Gestão

- **Controle de Acesso e Perfis:**
  - Hierarquia de permissões com três níveis: `fiscal`, `admin` e `superadmin`.
  - Bloqueio preventivo de novos cadastros até aprovação manual por administradores.
- **Gestão do Quadro de Funcionários:**
  - Cadastro individual e edição completa (cargos, empresas, setores).
  - Registro de desligamento com data de demissão, preservando o histórico integral de auditorias passadas.
  - Exportação completa do quadro geral em planilha CSV.
  - Importação de funcionários em lote a partir de planilhas Excel.
- **Gestão de Setores (Conservs):**
  - Módulo para criar, editar, ativar e inativar setores.
  - Vinculação do coordenador responsável por cada área.
- **Rastreabilidade e Auditoria Automática:**
  - *Trigger* nativo no banco de dados que registra automaticamente o histórico de transferências de setor de cada trabalhador, documentando origem, destino, data/hora e o usuário responsável pela alteração.

---

## 📊 Relatórios Gerenciais e Dossiê Individual

- **Relatórios Consolidados:**
  - Filtro por data única ou intervalo customizado de datas com seleção de setor.
  - **Exportação em PDF:** Documento institucional formatado em padrão A4, contendo indicadores consolidados e campos para assinaturas formais.
  - **Exportação em Excel (CSV):** Planilha detalhada com todos os apontamentos para análises externas e BI.
- **Dossiê Individual do Funcionário:**
  - Linha do tempo completa e comparativa calculada proporcionalmente às visitas de campo efetivamente auditadas.
  - Métricas de taxa de presença, faltas registradas e conformidade no uso de EPI.
  - Histórico cronológico de transferências entre setores.
  - Exportação individual em formatos PDF e CSV.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS |
| **PWA & Offline** | vite-plugin-pwa |
| **Backend & Banco de Dados** | Supabase (PostgreSQL, Row Level Security, Auth, Realtime) |
| **Exportação de Documentos** | jsPDF, jspdf-autotable |
| **Hospedagem & CI/CD** | Vercel |

---

## 🚀 Configuração e Execução Local

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- Conta e projeto configurados no **Supabase** com as tabelas:
  - `perfis`
  - `conservs`
  - `funcionarios`
  - `fiscalizacoes_diarias`
  - `historico_transferencias`
  *(com as políticas de Row Level Security devidamente aplicadas)*

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/bielgiglio/fiscaliza-rua
   cd fiscaliza-rua
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` (ou `.env.local`) na raiz do projeto com as chaves de acesso:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima-supabase
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Para testar em smartphones na mesma rede Wi-Fi:**
   ```bash
   npm run dev -- --host
   ```

6. **Gerar build de produção:**
   ```bash
   npm run build
   ```

---

## 📥 Padrão de Importação de Funcionários

Para a importação em lote na aba de administração, utilize um arquivo salvo no Excel como **CSV UTF-8 (delimitado por vírgulas)**.

### Estrutura do Cabeçalho

```csv
Nome,Codigo,Funcao,Empresa,Conserv
João da Silva,1045,Varredor,Empresa Exemplo,Conserv Centro
Maria Santos,1046,Roçador,Empresa Exemplo,Conserv Norte
```

- **`Nome`**: Obrigatório.
- **`Codigo`**, **`Funcao`**, **`Empresa`**: Opcionais.
- **`Conserv`**: Deve corresponder exatamente ao nome do setor cadastrado no sistema para que a alocação ocorra automaticamente.

---

## 🌐 Deploy

O projeto está otimizado para deploy contínuo na **Vercel**:

1. Conecte o repositório GitHub ao painel da Vercel.
2. Defina as variáveis de ambiente em **Project Settings > Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. No painel do **Supabase**, adicione o domínio gerado pela Vercel em **Authentication > URL Configuration (Site URL / Redirect URLs)** para habilitar o fluxo seguro de autenticação.
