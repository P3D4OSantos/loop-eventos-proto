# Configuração Firebase - Loop Eventos

## Passo 1: Criar projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nome do projeto: `loop-eventos` (ou outro de sua escolha)
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

## Passo 2: Configurar Realtime Database

1. No menu lateral, clique em "Realtime Database"
2. Clique em "Criar banco de dados"
3. Escolha localização: `united-states` ou `southamerica-east1` (São Paulo)
4. Modo de segurança: **Iniciar em modo de teste** (depois configurar regras)
5. Clique em "Ativar"

## Passo 3: Obter credenciais

1. No menu lateral, clique no ícone de engrenagem ⚙️ > "Configurações do projeto"
2. Role até "Seus aplicativos" e clique no ícone Web `</>`
3. Registre seu app com o nome "Loop Eventos Web"
4. Copie todo o objeto `firebaseConfig`

## Passo 4: Variáveis de ambiente (recomendado)

Em vez de colocar credenciais no código, use variáveis de ambiente. Copie os valores do `firebaseConfig` (Passo 3) e defina:

Chaves (todas obrigatórias):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (ex.: `https://SEU_PROJETO-default-rtdb.firebasedatabase.app`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Locais para configurar:
- Local: crie um arquivo `.env.local` na raiz do projeto
- Netlify (produção): Site settings → Build & deploy → Environment → Add variables

O arquivo `lib/firebase.js` já lê essas variáveis automaticamente.

## Passo 5: Configurar regras de segurança

No Firebase Console > Realtime Database > Regras, substitua por:

```json
{
  "rules": {
    "lotsConfig": { 
      ".read": true, 
      ".write": "auth != null" 
    },
    "sales": { 
      ".read": "auth != null",
      ".write": "auth != null" 
    },
    "__ping": { 
      ".read": true, 
      ".write": "auth != null" 
    }
  }
}
```

**IMPORTANTE:** Para produção, configure autenticação adequada!

## Passo 6: Habilitar autenticação anônima

Como o projeto usa `signInAnonymously` para permitir `.write` (regra `auth != null`), ative:

1. Firebase Console → Authentication → Sign-in method
2. Ative "Anonymous"
3. Salve

## Como funciona

- **Leitura:** Todos podem ver os lotes atualizados em tempo real
- **Escrita:** Apenas admin autenticado pode alterar (quando configurar auth)
- **Sincronização:** Alterações aparecem instantaneamente em todos os dispositivos

### Dicas de diagnóstico
- Se aparecer `auth/api-key-not-valid`, confirme a API Key e a URL do Realtime Database do mesmo projeto.
- No painel Admin, use o botão “Testar Firebase” para verificar escrita em `/__ping`.

## Testando

1. Abra o site em dois navegadores diferentes
2. Faça login no admin (usuário/senha local do app)
3. Altere um preço ou desative um lote
4. Veja a alteração aparecer instantaneamente no outro navegador!

## Dados salvos no Firebase

### `/lotsConfig` - Configuração dos lotes
- Status ativo/desativado de cada lote
- Preços (normal, mulher 0800, casadinha)
- Capacidade dos lotes
- Data de expiração

### `/sales` - Vendas registradas
- ID do pedido
- Lista de compradores (nome + telefone validado com DDD)
- Lote, tipo de ingresso, quantidade
- Preço unitário e total
- Timestamp da venda
- **Registra quando o usuário clica para enviar no WhatsApp**

## Próximos passos (opcional)

- Adicionar Firebase Authentication para segurança
- Salvar histórico de vendas
- Dashboard com estatísticas reais
- Notificações push para novos pedidos
