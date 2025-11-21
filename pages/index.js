import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { database, auth } from "../lib/firebase";
import { ref, onValue, set, get } from "firebase/database";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";


// EDITE AQUI para o número do admin que receberá as mensagens (formato: DDI + DDD + número, sem sinais)
const ADMIN_WA_NUMBER = "5587991270398"; // ex: 55 (Brasil) + DDD(87) + número

// Mock data
const EVENT = {
  id: "evt-loop-001",
  title: "LOOP NIGHT — Petrolina",
  date: "2025-12-13T21:30:00", // ISO - Horário atualizado  
  venue: "Terra do Sul, Petrolina",
  description:
    "Uma noite de som pesado, resenha e muita vibe. Pulseiras limitadas, cooler liberado com taxa, bebidas à venda.",
  capacity: 600,
  instagramUrl: "https://www.instagram.com/loopeventoss/", // seu Instagram
  groupUrl: "https://chat.whatsapp.com/HYvw77WunTr2q70mzpw7vF", // seu grupo
};

// Lotes mock - datas bem futuras para não expirar automaticamente
const LOTS = [
  { id: "lot1", name: "2º Lote", price: 30, capacity: 150, expiresAt: new Date(2026, 11, 31, 23, 59, 59), womenPrice: 30, couplePrice: 40 }, // 31 de dezembro de 2026
  { id: "lot2", name: "2º Lote", price: 30, capacity: 200, expiresAt: new Date(2026, 11, 31, 23, 59, 59) }, // 31 de dezembro de 2026
  { id: "lot3", name: "3º Lote", price: 40, capacity: 250, expiresAt: new Date(2026, 11, 31, 23, 59, 59), womenPrice: 40, couplePrice: 60 }, // 31 de dezembro de 2026
];



function getRandomVagas(capacity) {
  const min = Math.max(5, Math.floor(capacity * 0.05));
  const max = Math.max(min + 5, Math.floor(capacity * 0.9));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Home() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedLot, setSelectedLot] = useState(LOTS[0]);
  const [ticketType, setTicketType] = useState("normal"); // normal, woman, couple
  const [quantity, setQuantity] = useState(1);
  const [buyers, setBuyers] = useState([{ fullName: "", phone: "" }]);
  const [order, setOrder] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [vagasDisplay, setVagasDisplay] = useState([]);
  const [lotsConfig, setLotsConfig] = useState(LOTS.map(lot => ({ ...lot, active: lot.id === 'lot1' })));
  const [lotsConfigDraft, setLotsConfigDraft] = useState(LOTS.map(lot => ({ ...lot, active: lot.id === 'lot1' })));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [authUid, setAuthUid] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState("");
  const [salesStats, setSalesStats] = useState({ total: 0, revenue: 0, last24h: 0 });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState("config"); // "config" ou "sales"
  const [salesData, setSalesData] = useState([]);
  const ENV = useMemo(() => ({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }), []);

  useEffect(() => {
    setVagasDisplay(
      LOTS.map((l) => ({ lotId: l.id, vagas: getRandomVagas(l.capacity) }))
    );

    // Verificar se Firebase está disponível
    if (!auth || !database) {
      console.warn("Firebase não disponível, usando configuração local");
      setLotsConfig(LOTS.map(lot => ({ ...lot, active: lot.id === 'lot1' })));
      setIsDataLoaded(true);
      return;
    }

    // TIMEOUT DE FALLBACK - Se Firebase demorar mais que 3 segundos, mostra lotes locais
    const fallbackTimeout = setTimeout(() => {
      console.warn("🚨 Firebase timeout - mostrando lotes locais para não travar interface");
      setFirebaseStatus("Offline - usando configuração local");
      setLotsConfig(LOTS.map(lot => ({ ...lot, active: lot.id === 'lot1' })));
      setLotsConfigDraft(LOTS.map(lot => ({ ...lot, active: lot.id === 'lot1' })));
      setIsDataLoaded(true);
    }, 3000); // Reduzido de 5s para 3s

    // Auth anônima para habilitar regras com auth != null (não bloqueante)
    signInAnonymously(auth).catch((err) => {
      console.log("Firebase anonymous auth error:", err?.message);
    });

    // Observar mudança de auth para exibir UID e diagnosticar permissões
    const off = onAuthStateChanged(auth, (user) => {
      setAuthUid(user ? user.uid : null);
    });

    // Sincronizar métricas de vendas com detecção de problemas
    const salesRef = ref(database, 'sales');
    
    // Timeout para detectar problemas de conectividade nas vendas
    let connectionTimeout = setTimeout(() => {
      console.warn("⚠️ Firebase sales demorou para responder - possível problema de rede");
      setFirebaseStatus("Vendas offline");
    }, 3000); // Reduzido para 3s
    
    const unsubscribeSales = onValue(salesRef, (snapshot) => {
      clearTimeout(connectionTimeout); // Cancelar timeout se dados chegaram
      const data = snapshot.val();
      console.log("📊 Sales data from Firebase:", data); // Debug log
      if (data) {
        const salesArray = Object.values(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        console.log("📊 Sales array processed:", salesArray.length, "vendas"); // Debug log
        
        // Guardar dados detalhados para a aba de vendas
        setSalesData(salesArray);
        
        // Calcular métricas
        const total = salesArray.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        const revenue = salesArray.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
        const last24h = salesArray.filter(sale => {
          const saleTime = new Date(sale.timestamp);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return saleTime > dayAgo;
        }).reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        setSalesStats({ total, revenue, last24h });
        console.log("📊 Stats updated:", { total, revenue, last24h }); // Debug log
      } else {
        console.log("📊 No sales data found in Firebase"); // Debug log
        setSalesData([]);
        setSalesStats({ total: 0, revenue: 0, last24h: 0 });
      }
    }, (error) => {
      console.error("📊 Error reading sales:", error.message); // Error log
    });

    // Sincronização Firebase em tempo real
    const lotsRef = ref(database, 'lotsConfig');
    const unsubscribe = onValue(
      lotsRef,
      (snapshot) => {
        clearTimeout(fallbackTimeout); // Cancelar fallback se Firebase responder
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
          // Parse expiresAt back to Date for logic e garantir propriedades do lote 3
          const parsed = data.map((lot) => {
            const baseLot = LOTS.find(l => l.id === lot.id) || lot;
            return {
              ...baseLot, // Base com propriedades originais
              ...lot,     // Override com dados do Firebase
              expiresAt: lot.expiresAt ? new Date(lot.expiresAt) : null,
            };
          });
          setLotsConfig(parsed);
          setLotsConfigDraft(parsed);
          console.log("🔥 Firebase conectado - usando configuração remota");
          setFirebaseStatus("");
        } else {
          // Seed inicial com configuração local caso não exista
          const initial = LOTS.map((lot) => ({
            ...lot,
            active: lot.id === 'lot1', // Apenas 1º lote ativo por padrão
            // Salvar como ISO string para compatibilidade
            expiresAt: lot.expiresAt instanceof Date ? lot.expiresAt.toISOString() : lot.expiresAt,
          }));
          // Garante auth antes de gravar seed
          ensureAuth()
            .then(() => set(lotsRef, initial))
            .catch((e) => console.log('Seed write error:', e?.message));
          // Ajustar para Date na memória
          const parsedInitial = initial.map((lot) => ({ ...lot, expiresAt: new Date(lot.expiresAt) }));
          setLotsConfig(parsedInitial);
          setLotsConfigDraft(parsedInitial);
        }
        // Marcar dados como carregados após sincronização
        setIsDataLoaded(true);
      },
      (error) => {
        console.log("Firebase sync disabled or error:", error.message);
        clearTimeout(fallbackTimeout); // Cancelar timeout mesmo em caso de erro
        // Em caso de erro, usar configuração local e mostrar interface
        setLotsConfig(LOTS.map(lot => ({ ...lot, active: lot.id === 'lot1' })));
        setLotsConfigDraft(LOTS.map(lot => ({ ...lot, active: lot.id === 'lot1' })));
        setIsDataLoaded(true);
        setFirebaseStatus("Erro de conectividade");
      }
    );

    return () => { 
      clearTimeout(fallbackTimeout); // Limpar timeout ao desmontar componente
      if (unsubscribe) unsubscribe();
      if (off) off();
      if (unsubscribeSales) unsubscribeSales();
    };
  }, []);

  // Garante que há um usuário anônimo autenticado antes de escrever
  async function ensureAuth() {
    try {
      if (!auth) {
        throw new Error("Firebase Auth não disponível");
      }
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      return auth.currentUser;
    } catch (e) {
      throw e;
    }
  }

  // Persistência centralizada com serialização de datas
  async function saveLotsConfig(config) {
    const serializable = config.map((lot) => ({
      ...lot,
      expiresAt: lot.expiresAt instanceof Date ? lot.expiresAt.toISOString() : lot.expiresAt,
    }));
    const lotsRef = ref(database, 'lotsConfig');
    await ensureAuth();
    return set(lotsRef, serializable);
  }

  // Teste ativo de escrita para diagnosticar regras
  async function testFirebasePermissions() {
    try {
      await ensureAuth();
      const testRef = ref(database, '__ping');
      await set(testRef, { t: Date.now(), uid: auth.currentUser?.uid || null });
      setFirebaseStatus('OK: escrita permitida.');
    } catch (e) {
      setFirebaseStatus(`ERRO: ${e?.code || e?.message || 'permission_denied'}`);
    }
  }

  // Exportar vendas para CSV
  async function exportSalesToCSV() {
    try {
      const salesRef = ref(database, 'sales');
      const snapshot = await get(salesRef);
      const data = snapshot.val();
      
      if (!data) {
        alert('Nenhuma venda registrada ainda.');
        return;
      }

      const salesArray = Object.values(data);
      
      // Cabeçalho do CSV
      let csv = 'Pedido,Data/Hora,Lote,Tipo,Quantidade,Valor Total,Nome Completo,Telefone\n';
      
      // Adiciona cada venda com múltiplas linhas para múltiplos compradores
      salesArray.forEach(sale => {
        const timestamp = new Date(sale.timestamp).toLocaleString('pt-BR');
        sale.buyers.forEach((buyer, idx) => {
          csv += `"${sale.orderId}","${timestamp}","${sale.lot}","${sale.ticketType}","${sale.quantity}","R$ ${sale.totalPrice}","${buyer.fullName}","${buyer.phone}"\n`;
        });
      });

      // Criar blob e download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `vendas-loop-eventos-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert(`Erro ao exportar: ${e.message}`);
    }
  }

  const now = new Date();
  const eventDate = new Date(EVENT.date);

  function isLotExpired(lot) {
    return now > lot.expiresAt;
  }

  function formatExpirationDate(date) {
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: 'long' 
    }).format(date);
  }

  function isWomenFree() {
    const freeCutoff = new Date(eventDate);
    freeCutoff.setHours(0, 0, 0, 0);
    return now < freeCutoff;
  }

  function handleAdminLogin() {
    // Credenciais simples (em produção, usar autenticação real)
    if (adminUsername === "admin" && adminPassword === "loop2025") {
      setIsAdminAuthenticated(true);
      setAdminPassword("");
    } else {
      alert("Usuário ou senha incorretos!");
    }
  }

  function handleAdminLogout() {
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
    setAdminUsername("");
    setAdminPassword("");
  }

  function toggleLotActive(lotId) {
    const updatedConfig = lotsConfigDraft.map(lot => 
      lot.id === lotId ? { ...lot, active: !lot.active } : lot
    );
    setLotsConfigDraft(updatedConfig);
    setHasUnsavedChanges(true);
  }

  function updateLotPrice(lotId, field, value) {
    const updatedConfig = lotsConfigDraft.map(lot => {
      if (lot.id === lotId) {
        const numericValue = value === '' ? 0 : parseFloat(value);
        return { 
          ...lot, 
          [field]: isNaN(numericValue) ? 0 : numericValue 
        };
      }
      return lot;
    });
    setLotsConfigDraft(updatedConfig);
    setHasUnsavedChanges(true);
  }

  async function saveChanges() {
    try {
      await saveLotsConfig(lotsConfigDraft);
      setLotsConfig(lotsConfigDraft);
      setHasUnsavedChanges(false);
      alert('Alterações salvas com sucesso!');
    } catch (err) {
      console.log("Firebase save error:", err.message);
      alert('Erro ao salvar. Verifique as permissões do Firebase.');
    }
  }

  async function forceReloadData() {
    try {
      console.log("🔄 Forçando reload dos dados Firebase...");
      setFirebaseStatus("Atualizando dados...");
      
      // Forçar nova leitura dos dados
      const salesRef = ref(database, 'sales');
      const snapshot = await get(salesRef);
      const data = snapshot.val();
      
      console.log("🔄 Dados recarregados:", data);
      
      if (data) {
        const salesArray = Object.values(data).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setSalesData(salesArray);
        
        const total = salesArray.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        const revenue = salesArray.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
        const last24h = salesArray.filter(sale => {
          const saleTime = new Date(sale.timestamp);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return saleTime > dayAgo;
        }).reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        setSalesStats({ total, revenue, last24h });
        
        setFirebaseStatus("Dados atualizados!");
        setTimeout(() => setFirebaseStatus(""), 2000);
      } else {
        setSalesData([]);
        setSalesStats({ total: 0, revenue: 0, last24h: 0 });
        setFirebaseStatus("Nenhuma venda encontrada");
      }
    } catch (error) {
      console.error("❌ Erro ao recarregar:", error.message);
      setFirebaseStatus("Erro na atualização");
    }
  }

  async function resetSalesMetrics() {
    const confirmReset = confirm(
      "⚠️ ATENÇÃO: Isso irá remover TODAS as vendas e métricas salvas no Firebase.\n\n" +
      "Esta ação é IRREVERSÍVEL!\n\n" +
      "Tem certeza que deseja continuar?"
    );
    
    if (!confirmReset) return;
    
    try {
      // Remove todo o nó 'sales' do Firebase
      const salesRef = ref(database, 'sales');
      await set(salesRef, null);
      
      // Reset local das métricas e dados
      setSalesStats({ total: 0, revenue: 0, last24h: 0 });
      setSalesData([]);
      
      alert('✅ Métricas limpas com sucesso!\n\nTodas as vendas de teste foram removidas.');
      console.log("🗑️ Sales metrics reset completed");
    } catch (error) {
      console.error("❌ Error resetting sales:", error.message);
      alert('❌ Erro ao limpar métricas: ' + error.message);
    }
  }

  function discardChanges() {
    setLotsConfigDraft(lotsConfig);
    setHasUnsavedChanges(false);
  }

  function openCheckout(lot, type = "normal") {
    setSelectedLot(lot || LOTS[0]);
    setTicketType(type);
    const initialQty = type === "couple" ? 2 : 1;
    setQuantity(initialQty);
    setBuyers(Array(initialQty).fill(null).map(() => ({ fullName: "", phone: "" })));
    setShowCheckout(true);
  }

  function handleQuantityChange(newQuantity) {
    newQuantity = Math.max(1, Number(newQuantity));
    setQuantity(newQuantity);
    // ajusta array de buyers conforme quantidade
    setBuyers(prev => {
      if (newQuantity > prev.length) {
        return [...prev, ...Array(newQuantity - prev.length).fill(null).map(() => ({ fullName: "", phone: "" }))];
      } else {
        return prev.slice(0, newQuantity);
      }
    });
  }

  function handleBuyerChange(index, field, value) {
    setBuyers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function getTicketPrice(lot) {
    if (ticketType === "woman" && isWomenFree()) {
      return 0; // FREE
    }
    if (ticketType === "woman" && lot.womenPrice) {
      return lot.womenPrice;
    }
    if (ticketType === "couple" && lot.couplePrice) {
      return lot.couplePrice;
    }
    return lot.price;
  }

  function getTicketTypeLabel() {
    if (ticketType === "woman") return "Mulher 0800";
    if (ticketType === "couple") return "Casadinha";
    return "Normal";
  }

  // Valida telefone brasileiro: DDD (2 dígitos) + número (8 ou 9 dígitos)
  function isValidBrazilianPhone(phone) {
    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');
    // Aceita: 11 dígitos (DDD + 9 dígitos) ou 10 dígitos (DDD + 8 dígitos)
    // DDD válidos: 11-99
    if (cleaned.length < 10 || cleaned.length > 11) return false;
    const ddd = parseInt(cleaned.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    return true;
  }

  function sendInfoToAdmin() {
    // validações
    for (let i = 0; i < buyers.length; i++) {
      if (!buyers[i].fullName.trim()) {
        alert(`Por favor, informe o nome completo da pessoa ${i + 1}.`);
        return;
      }
      if (!buyers[i].phone.trim()) {
        alert(`Por favor, informe o telefone com DDD da pessoa ${i + 1}.`);
        return;
      }
      if (!isValidBrazilianPhone(buyers[i].phone)) {
        alert(`Telefone inválido para a pessoa ${i + 1}. Use o formato: DDD + número (ex: 87981234567 ou 8798123456).`);
        return;
      }
    }

    // Gera payload e mensagem com lista de pessoas
    const id = `LOOP-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
    const buyersList = buyers.map((b, i) => `${i + 1}. ${b.fullName} — ${b.phone}`).join("\n");
    const ticketPrice = getTicketPrice(selectedLot);
    const totalPrice = ticketType === "couple" ? ticketPrice : ticketPrice * quantity;
    
    const payload = {
      orderId: id,
      buyers: buyers,
      event: EVENT.title,
      lot: selectedLot.name,
      lotId: selectedLot.id,
      ticketType: getTicketTypeLabel(),
      quantity: quantity,
      unitPrice: ticketPrice,
      totalPrice: totalPrice,
      timestamp: new Date().toISOString(),
    };
    setOrder(payload);
    setShowCheckout(false);

    // Salvar venda no Firebase com retry
    const saveSaleToFirebase = async (attempt = 1) => {
      const salesRef = ref(database, `sales/${id}`);
      console.log(`💾 Tentativa ${attempt}: Salvando venda no Firebase:`, id, payload);
      
      try {
        await set(salesRef, payload);
        console.log("✅ Venda salva com sucesso:", id);
        // Mostrar confirmação visual ao usuário
        if (attempt > 1) {
          alert("✅ Pedido registrado com sucesso após retry!");
        }
      } catch (err) {
        console.error(`❌ Erro na tentativa ${attempt}:`, err.message);
        
        if (attempt < 3) {
          // Retry automático após 2 segundos
          console.log(`🔄 Tentando novamente em 2s... (tentativa ${attempt + 1}/3)`);
          setTimeout(() => saveSaleToFirebase(attempt + 1), 2000);
        } else {
          // Falha definitiva - alertar usuário
          console.error("❌ Falha definitiva ao salvar no Firebase após 3 tentativas");
          alert(`⚠️ ATENÇÃO: Sua mensagem foi enviada para o WhatsApp, mas houve um problema técnico no registro.\n\nSeu pedido ${id} será processado manualmente.\n\nNão se preocupe - você receberá a resposta no WhatsApp normalmente!`);
        }
      }
    };
    
    // Verificar se Firebase está disponível
    if (!database) {
      console.warn("⚠️ Firebase não disponível - apenas WhatsApp funcionará");
      alert("⚠️ Sistema em modo offline - seu pedido será processado via WhatsApp.");
    } else {
      saveSaleToFirebase();
    }

    const text = `Olá Loop Eventos!

Estou interessado em comprar ${quantity} ingresso(s) para *${EVENT.title}* ( ${selectedLot.name} ).

**Tipo:** ${getTicketTypeLabel()}
**Preço unitário:** R$ ${ticketPrice}
**Total:** R$ ${totalPrice}

**Lista de Ingressos:**
${buyersList}

Pedido (referência): ${id}

Por favor, me enviem a chave PIX e instruções de pagamento. Assim que eu enviar o comprovante, favor confirmar a inclusão na lista.`;

    const waLink = `https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(waLink, "_blank");
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="max-w-4xl mx-auto p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/social-loop-logo.jpg" alt="Social Loop Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-pink-500" style={{textShadow: '0 0 14px rgba(255,77,166,0.95)', color: '#ff4da6'}}>Loop Eventos</h1>
              <p className="text-xs text-purple-300">Petrolina • Eventos Exclusivos</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
          <a
            href={EVENT.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm text-white" 
            style={{border: '1px solid rgba(255,77,166,0.2)', boxShadow: '0 0 10px rgba(255,77,166,0.1)', background: 'linear-gradient(90deg, rgba(255,77,166,0.1), rgba(124,77,255,0.1))'}}
            title="Seguir no Instagram"
          >
            📷 Instagram
          </a>
          <a
            href={EVENT.groupUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm text-white" 
            style={{border: '1px solid rgba(124,77,255,0.2)', boxShadow: '0 0 10px rgba(124,77,255,0.1)', background: 'linear-gradient(90deg, rgba(124,77,255,0.1), rgba(255,77,166,0.1))'}}
            title="Entrar no grupo aberto"
          >
            💬 Grupo
          </a>
          <button
            onClick={() => setIsAdminOpen(true)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm text-white" 
            style={{border: '1px solid rgba(124,77,255,0.2)', boxShadow: '0 0 10px rgba(124,77,255,0.1)', background: 'linear-gradient(90deg, rgba(124,77,255,0.1), rgba(255,77,166,0.1))'}}
          >
            🔐 Admin
          </button>
        </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-4">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl overflow-hidden shadow-lg p-3 sm:p-4 mb-4 sm:mb-6"
        >
          <div className="flex flex-col gap-3 sm:gap-4 items-start">
            <div className="w-full">
              <h2 className="text-xl sm:text-2xl font-black text-pink-500" style={{textShadow: '0 0 18px rgba(255,77,166,0.95)', color: '#ff4da6'}}>{EVENT.title}</h2>
              <p className="text-xs sm:text-sm mt-2 text-blue-200">{EVENT.description}</p>
              <p className="text-xs mt-2 sm:mt-3 text-purple-300">{EVENT.venue} • {eventDate.toLocaleString()}</p>
            </div>

            <div className="w-full mt-3 sm:mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
              {!isDataLoaded ? (
                // Loading state - impede flash de conteúdo
                <div className="w-full flex justify-center items-center py-8">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-purple-300 text-sm">Carregando lotes...</span>
                  </div>
                </div>
              ) : (
                lotsConfig.filter(lot => lot.active).map((lot) => {
                const vagas = vagasDisplay.find((v) => v.lotId === lot.id)?.vagas ?? 10;
                return (
                  <div key={lot.id} className="rounded-lg p-3 w-full sm:w-64" style={{background: 'rgba(10,10,10,0.6)', border: '1px solid rgba(124,77,255,0.18)', boxShadow: '0 0 18px rgba(124,77,255,0.06)'}}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-pink-400" style={{textShadow:'0 0 8px rgba(255,77,166,0.8)'}}>{lot.name}</div>
                        <div className="text-xs text-blue-300" style={{textShadow:'0 0 6px rgba(124,77,255,0.7)'}}>R$ {lot.price}</div>
                        <div className="text-xs text-purple-300 mt-1">Disponível</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      {lot.couplePrice ? (
                        <button
                          onClick={() => openCheckout(lot)}
                          className="w-full sm:flex-1 rounded-md px-3 py-2 font-bold text-xs sm:text-sm" 
                          style={{
                            background: 'linear-gradient(90deg, #ff4da6, #7c4dff)', 
                            color: '#ffffff', 
                            boxShadow: '0 0 20px rgba(124,77,255,0.35), 0 0 12px rgba(255,77,166,0.25)',
                            cursor: 'pointer'
                          }}
                        >
                          👤 Normal — R$ {lot.price}
                        </button>
                      ) : (
                        <button
                          onClick={() => openCheckout(lot)}
                          className="w-full sm:flex-1 rounded-md px-3 py-2 font-bold text-sm" 
                          style={{
                            background: 'linear-gradient(90deg, #ff4da6, #7c4dff)', 
                            color: '#ffffff', 
                            boxShadow: '0 0 20px rgba(124,77,255,0.35), 0 0 12px rgba(255,77,166,0.25)',
                            cursor: 'pointer'
                          }}
                        >
                          Quero Comprar
                        </button>
                      )}
                      {lot.couplePrice && (
                        <button
                          onClick={() => openCheckout(lot, "couple")}
                          className="w-full sm:flex-1 rounded-md px-3 py-2 font-bold text-xs sm:text-sm" 
                          style={{
                            background: 'linear-gradient(90deg, #ff6b9d, #c77dff)',
                            color: '#ffffff',
                            boxShadow: '0 0 15px rgba(255,107,157,0.4)',
                            cursor: 'pointer'
                          }}
                        >
                          💍 Casadinha — R$ {lot.couplePrice}
                        </button>
                      )}
                      {!lot.couplePrice && (
                        <button
                          onClick={() => openCheckout(lot, "woman")}
                          className="w-full sm:bg-transparent border border-white rounded-md px-3 py-2 text-xs sm:text-sm text-white" 
                          style={{
                            textShadow:'0 0 10px rgba(255,77,166,0.8)',
                            cursor: 'pointer'
                          }}
                        >
                          👩 Mulher 0800 — {isWomenFree() ? "FREE" : `R$ ${lot.price}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </motion.section>

        <section className="mb-8">
          <h3 className="text-lg font-bold mb-2 text-white">Como comprar</h3>
          <p className="text-sm text-white mb-3">Preencha o formulário no botão do lote. Enviaremos a chave PIX pelo WhatsApp do admin. Você fará o pagamento por PIX e, depois de enviar o comprovante, confirmaremos sua inclusão na lista.</p>
          <div className="bg-white/5 border border-purple-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-200"><strong>📌 Após a compra:</strong> Você receberá o link do grupo fechado do evento pelo WhatsApp, com o local exato, horário e informações importantes. Mantenha o grupo salvo para atualizações!</p>
          </div>
        </section>

        <footer className="text-center text-xs text-blue-300 py-8">
          © {new Date().getFullYear()} Loop Eventos — Petrolina
          <div className="mt-2">
            <a href="https://loop-eventos-pnz.netlify.app/" className="text-purple-400 hover:text-purple-300">loop-eventos-pnz.netlify.app</a>
          </div>
        </footer>
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl p-4 sm:p-6 w-full max-w-md my-4 sm:my-8" style={{background: 'linear-gradient(180deg, rgba(10,10,10,0.9), rgba(15,15,15,0.95))', boxShadow: '0 0 30px rgba(124,77,255,0.08)'}}>
            <h4 className="text-xl sm:text-2xl font-bold mb-2 text-white" style={{textShadow:'0 0 10px rgba(255,77,166,0.8)'}}>Pedido — {selectedLot.name}</h4>
            <div className="bg-purple-500/20 rounded px-3 py-2 mb-4 border border-purple-500/40">
              <p className="text-sm text-purple-200"><strong>Tipo:</strong> {getTicketTypeLabel()} | <strong>Valor:</strong> {ticketType === "woman" && isWomenFree() ? "FREE" : `R$ ${getTicketPrice(selectedLot)}`}</p>
            </div>
            <p className="text-base text-purple-300 mb-4">Informe os dados de cada pessoa</p>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {ticketType !== "couple" && (
                <div className="flex items-center justify-between mb-4">
                  <label className="text-base text-white font-semibold">Quantidade de ingressos:</label>
                  
                  {/* Controle estilo iFood */}
                  <div className="flex items-center bg-gray-800 rounded-lg border border-purple-500/30 overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className={`w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors ${
                        quantity <= 1 
                          ? 'text-gray-500 cursor-not-allowed' 
                          : 'text-white hover:bg-purple-600/50 active:bg-purple-600'
                      }`}
                    >
                      −
                    </button>
                    
                    <div className="w-12 h-10 flex items-center justify-center bg-gray-900 text-white font-semibold text-base border-x border-purple-500/30">
                      {quantity}
                    </div>
                    
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-lg font-bold text-white hover:bg-purple-600/50 active:bg-purple-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {buyers.map((buyer, index) => (
                <div key={index} className="p-4 bg-white/5 rounded-lg border border-purple-500/30">
                  <h5 className="text-sm font-bold text-pink-400 mb-3">Pessoa {index + 1}</h5>
                  <div className="space-y-2">
                    <input 
                      value={buyer.fullName} 
                      onChange={(e) => handleBuyerChange(index, 'fullName', e.target.value)} 
                      placeholder="Nome completo" 
                      className="w-full p-2 rounded bg-gray-800 text-white placeholder-gray-400 text-sm" 
                    />
                    <input 
                      value={buyer.phone} 
                      onChange={(e) => handleBuyerChange(index, 'phone', e.target.value)} 
                      placeholder="Telefone (com DDD)" 
                      className="w-full p-2 rounded bg-gray-800 text-white placeholder-gray-400 text-sm" 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between gap-2">
              <button onClick={() => setShowCheckout(false)} className="px-4 py-3 rounded bg-white/10 text-base font-semibold text-white hover:bg-white/20">Cancelar</button>
              <button onClick={sendInfoToAdmin} className="px-4 py-3 rounded font-bold text-base" style={{background: 'linear-gradient(90deg,#ff4da6,#7c4dff)', color: '#ffffff', boxShadow: '0 0 18px rgba(255,77,166,0.25)'}}>Enviar via WhatsApp</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Order confirmation small toast */}
      {order && (
        <div className="fixed bottom-6 right-6 bg-white/10 p-4 rounded-lg backdrop-blur z-40 max-w-xs">
          <div className="text-sm font-bold text-white">Pedido enviado: <span className="text-pink-400">{order.orderId}</span></div>
          <div className="text-xs text-purple-300 mt-1">Quantidade: {order.quantity} • Lote: {order.lot}</div>
          <div className="text-xs text-gray-300 mt-2">Pessoas: {order.buyers.map(b => b.fullName).join(", ")}</div>
          <div className="mt-3 flex gap-2">
            <a
              className="text-xs underline text-blue-300 hover:text-blue-200"
              href={`https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(`Olá Loop Eventos! Pedido ${order.orderId} - Quantidade ${order.quantity}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir WhatsApp
            </a>
            <button onClick={() => setOrder(null)} className="text-xs text-gray-400 hover:text-gray-200">Fechar</button>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {isAdminOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gray-900 rounded-xl p-4 sm:p-6 w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white">🔐 Painel Admin</h3>
              <button onClick={() => setIsAdminOpen(false)} className="text-2xl sm:text-3xl font-bold text-gray-400 hover:text-white transition" title="Fechar">✕</button>
            </div>

            {!isAdminAuthenticated ? (
              <div className="space-y-4">
                <p className="text-purple-300 mb-4">Faça login para acessar o painel de gerenciamento</p>
                <div>
                  <label className="block text-sm text-white mb-2">Usuário</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-purple-500/30"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white mb-2">Senha</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className="w-full p-3 rounded bg-gray-800 text-white border border-purple-500/30"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  onClick={handleAdminLogin}
                  className="w-full py-3 rounded-md font-bold text-white"
                  style={{background: 'linear-gradient(90deg, #ff4da6, #7c4dff)'}}
                >
                  Entrar
                </button>
              </div>
            ) : (
              <div>
                {/* Navegação por Abas */}
                <div className="border-b border-purple-500/30 mb-6">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setActiveAdminTab("config")}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeAdminTab === "config"
                          ? "bg-purple-600 text-white border-b-2 border-purple-400"
                          : "text-purple-300 hover:text-white hover:bg-purple-800/50"
                      }`}
                    >
                      ⚙️ Configurações
                    </button>
                    <button
                      onClick={() => setActiveAdminTab("sales")}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeAdminTab === "sales"
                          ? "bg-purple-600 text-white border-b-2 border-purple-400"
                          : "text-purple-300 hover:text-white hover:bg-purple-800/50"
                      }`}
                    >
                      📊 Vendas ao Vivo ({salesData.length})
                    </button>
                  </div>
                </div>

                {/* Aba de Configurações */}
                {activeAdminTab === "config" && (
                <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-purple-300">Bem-vindo, <strong>{adminUsername}</strong></p>
                    <p className="text-xs text-blue-300 mt-1">UID: {authUid || 'não autenticado'}</p>
                    {firebaseStatus && (
                      <p className={`text-xs mt-1 ${firebaseStatus.startsWith('OK') ? 'text-green-400' : 'text-red-400'}`}>{firebaseStatus}</p>
                    )}
                    <div className="text-[11px] text-gray-400 mt-2">
                      <div>API Key: {ENV.apiKey ? `${ENV.apiKey.slice(0,6)}…${ENV.apiKey.slice(-4)}` : 'indefinido'}</div>
                      <div>Auth Domain: {ENV.authDomain || 'indefinido'}</div>
                      <div>DB URL: {ENV.databaseURL || 'indefinido'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={testFirebasePermissions} className="text-sm px-3 py-1 rounded bg-blue-600 hover:bg-blue-700">Testar Firebase</button>
                    <button onClick={handleAdminLogout} className="text-sm px-3 py-1 rounded bg-red-600 hover:bg-red-700">Sair</button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 rounded text-white">
                    <div className="text-sm text-purple-300">Ingressos vendidos</div>
                    <div className="text-2xl font-extrabold mt-2">{salesStats.total}</div>
                    <div className="text-xs text-gray-400 mt-1">Total de ingressos clicados</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded text-white">
                    <div className="text-sm text-purple-300">Receita potencial</div>
                    <div className="text-2xl font-extrabold mt-2">R$ {salesStats.revenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">Baseado nos cliques no WhatsApp</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded text-white">
                    <div className="text-sm text-purple-300">Vendas últimas 24h</div>
                    <div className="text-2xl font-extrabold mt-2">{salesStats.last24h}</div>
                    <div className="text-xs text-gray-400 mt-1">Ingressos das últimas 24 horas</div>
                  </div>
                </div>

                {/* Botões de Controle */}
                <div className="mt-4 text-center space-y-2">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={forceReloadData}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      title="Forçar atualização dos dados do Firebase"
                    >
                      🔄 Atualizar Dados
                    </button>
                    <button
                      onClick={resetSalesMetrics}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      title="Limpar todos os dados de vendas (irreversível)"
                    >
                      🗑️ Limpar Métricas
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Use "Atualizar" se não vê vendas recentes | "Limpar" remove tudo (irreversível)
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-white">⚙️ Gerenciar Lotes</h4>
                    {hasUnsavedChanges && (
                      <div className="flex gap-2">
                        <button onClick={discardChanges} className="text-sm px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white">Descartar</button>
                        <button onClick={saveChanges} className="text-sm px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white font-bold">💾 Salvar Alterações</button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {lotsConfigDraft.filter(lot => lot.active).map((lot) => (
                      <div key={lot.id} className="bg-white/5 p-4 rounded border border-purple-500/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={lot.active} 
                              onChange={() => toggleLotActive(lot.id)}
                              className="w-5 h-5"
                            />
                            <span className="font-bold text-white">{lot.name}</span>
                            <span className={`text-xs px-2 py-1 rounded ${lot.active ? 'bg-green-600' : 'bg-red-600'}`}>
                              {lot.active ? 'Ativo' : 'Desativado'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <label className="block text-xs text-purple-300 mb-1">Preço Normal</label>
                            <input 
                              type="number" 
                              value={lot.price || 0} 
                              onChange={(e) => updateLotPrice(lot.id, 'price', e.target.value)}
                              className="w-full p-2 rounded bg-gray-800 text-white"
                              min="0"
                            />
                          </div>
                          {lot.id === 'lot3' && (
                            <div>
                              <label className="block text-xs text-purple-300 mb-1">Mulher 0800</label>
                              <input 
                                type="number" 
                                value={lot.womenPrice || 0} 
                                onChange={(e) => updateLotPrice(lot.id, 'womenPrice', e.target.value)}
                                className="w-full p-2 rounded bg-gray-800 text-white"
                                min="0"
                              />
                            </div>
                          )}
                          {lot.id === 'lot3' && (
                            <div>
                              <label className="block text-xs text-purple-300 mb-1">Casadinha</label>
                              <input 
                                type="number" 
                                value={lot.couplePrice || 0} 
                                onChange={(e) => updateLotPrice(lot.id, 'couplePrice', e.target.value)}
                                className="w-full p-2 rounded bg-gray-800 text-white"
                                min="0"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs text-purple-300 mb-1">Capacidade</label>
                            <input 
                              type="number" 
                              value={lot.capacity || 0} 
                              onChange={(e) => updateLotPrice(lot.id, 'capacity', e.target.value)}
                              className="w-full p-2 rounded bg-gray-800 text-white"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>



                <div className="mt-6 flex justify-end">
                  <button onClick={exportSalesToCSV} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">📊 Exportar Vendas CSV</button>
                </div>
                </div>
                )}

                {/* Aba de Vendas ao Vivo */}
                {activeAdminTab === "sales" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">🔴 Vendas em Tempo Real</h3>
                    <div className="text-sm text-purple-300">
                      {salesData.length} {salesData.length === 1 ? 'venda' : 'vendas'} registradas
                    </div>
                  </div>

                  {salesData.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">📭</div>
                      <p>Nenhuma venda registrada ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {salesData.map((sale) => (
                        <div key={sale.orderId} className="bg-white/5 p-4 rounded-lg border border-purple-500/20">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded font-mono">
                                {sale.orderId}
                              </span>
                              <span className="ml-2 text-xs text-purple-300">
                                {new Date(sale.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-400">R$ {sale.totalPrice}</div>
                              <div className="text-xs text-gray-400">{sale.lot}</div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-white">
                            <strong>Tipo:</strong> {sale.ticketType} | <strong>Qtd:</strong> {sale.quantity}
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            {sale.buyers.map((buyer, idx) => (
                              <div key={idx} className="text-sm text-purple-200 bg-black/20 p-2 rounded">
                                <strong>{buyer.fullName}</strong> - {buyer.phone}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
