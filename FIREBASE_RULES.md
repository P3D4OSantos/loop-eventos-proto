# 🔥 Firebase Rules - Loop Eventos

## 🚨 PROBLEMA IDENTIFICADO:
```
permission_denied at /sales: Client doesn't have permission to access the desired data.
```

## 🛠️ SOLUÇÃO - Regras Firebase:

### **1. Acesse o Firebase Console:**
https://console.firebase.google.com/project/loop-9f3ed/database/loop-9f3ed-default-rtdb/rules

### **2. Substitua as regras atuais por:**

```json
{
  "rules": {
    "lotsConfig": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "sales": {
      ".read": "auth != null", 
      ".write": "auth != null",
      "$saleId": {
        ".validate": "newData.hasChildren(['orderId', 'buyers', 'timestamp'])"
      }
    }
  }
}
```

### **3. Clique "Publicar"**

## ✅ **Resultado esperado:**
- ✅ Leitura de vendas funcionará
- ✅ Gravação de vendas funcionará  
- ✅ Métricas aparecerão em todos dispositivos
- ✅ Aba "Vendas ao Vivo" funcionará

## 🔒 **Segurança mantida:**
- Requer autenticação anônima (auth != null)
- Valida estrutura dos dados de venda
- Protege contra acesso não autorizado

## 📱 **Teste após mudança:**
1. Faça nova compra teste
2. Console deve mostrar: ✅ Venda salva com sucesso
3. Métricas devem aparecer no painel admin