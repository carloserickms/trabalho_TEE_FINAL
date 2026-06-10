# Scholar Insights — Setup Local

## Pré-requisitos

Antes de começar, instale:

- Node.js 20+ (recomendado: Node.js 22 LTS)
- npm ou pnpm
- Git

Verifique as versões:

```bash
node -v
npm -v
```

---

# Clonando o projeto

```bash
git clone https://github.com/guilherme3987/scholar-insights.git
cd scholar-insights
```

---

# Instalando dependências

## Usando npm

```bash
npm install
```

## Ou usando pnpm

```bash
pnpm install
```

---

# Executando o projeto

## Ambiente de desenvolvimento

```bash
npm run dev
```

ou

```bash
pnpm dev
```

Após iniciar, abra:

```text
http://localhost:3000
```

ou a porta exibida no terminal pelo Vite.

---

# Build de produção

```bash
npm run build
```

ou

```bash
pnpm build
```

Os arquivos gerados ficarão na pasta:

```text
dist/
```

---

# Preview da build

```bash
npm run preview
```

ou

```bash
pnpm preview
```

---

# Scripts disponíveis

| Script            | Descrição                          |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Inicia ambiente de desenvolvimento |
| `npm run build`   | Gera build de produção             |
| `npm run preview` | Executa preview da build           |
| `npm run lint`    | Executa lint do projeto            |
| `npm run format`  | Formata código com prettier        |

---

# Stack utilizada

- React 19
- TypeScript
- Vite
- TailwindCSS 4
- TanStack Router
- React Query
- Radix UI
- Zod
- Recharts

---

# Estrutura esperada

```text
scholar-insights/
├── src/
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

# Variáveis de ambiente

Caso exista um arquivo `.env.example`, crie um `.env`:

```bash
cp .env.example .env
```

Depois preencha as variáveis necessárias.

---

# Possíveis problemas

## Erro de versão do Node

Atualize para Node.js 20+:

```bash
node -v
```

## Dependências quebradas

Remova `node_modules` e reinstale:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

# Licença

Este projeto pertence ao autor do repositório original:

[https://github.com/guilherme3987/scholar-insights](https://github.com/guilherme3987/scholar-insights)
