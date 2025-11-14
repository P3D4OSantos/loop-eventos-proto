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

## Passo 4: Configurar no projeto

Abra o arquivo `lib/firebase.js` e substitua as credenciais:

```javascript
const firebaseConfig = {
  apiKey: "AIza...", // Cole aqui
  authDomain: "loop-eventos-xxxx.firebaseapp.com",
  databaseURL: "https://loop-eventos-xxxx-default-rtdb.firebaseio.com",
  projectId: "loop-eventos-xxxx",
  storageBucket: "loop-eventos-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

## Passo 5: Configurar regras de segurança

No Firebase Console > Realtime Database > Regras, substitua por:

```json
{
  "rules": {
    "lotsConfig": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

**IMPORTANTE:** Para produção, configure autenticação adequada!

## Como funciona

- **Leitura:** Todos podem ver os lotes atualizados em tempo real
- **Escrita:** Apenas admin autenticado pode alterar (quando configurar auth)
- **Sincronização:** Alterações aparecem instantaneamente em todos os dispositivos

## Testando

1. Abra o site em dois navegadores diferentes
2. Faça login no admin em um deles
3. Altere um preço ou desative um lote
4. Veja a alteração aparecer instantaneamente no outro navegador!

## Dados salvos no Firebase

- Status ativo/desativado de cada lote
- Preços (normal, mulher 0800, casadinha)
- Capacidade dos lotes

## Próximos passos (opcional)

- Adicionar Firebase Authentication para segurança
- Salvar histórico de vendas
- Dashboard com estatísticas reais
- Notificações push para novos pedidos
