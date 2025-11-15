import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { database, auth } from "../lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { signInAnonymously } from "firebase/auth";

// EDITE AQUI para o número do admin que receberá as mensagens (formato: DDI + DDD + número, sem sinais)
const ADMIN_WA_NUMBER = "5587981758255"; // ex: 55 (Brasil) + DDD(87) + número

// Mock data
const EVENT = {
  id: "evt-loop-001",
  title: "LOOP NIGHT — Petrolina (CI TEST)",
  date: "2025-12-13T18:00:00", // ISO
  venue: "Terra do Sul, Petrolina",
  description:
    "Uma noite de som pesado, resenha e muita vibe. Pulseiras limitadas, cooler liberado com taxa, bebidas à venda.",
  capacity: 600,
  instagramUrl: "https://www.instagram.com/loopeventoss/", // seu Instagram
  groupUrl: "https://chat.whatsapp.com/HYvw77WunTr2q70mzpw7vF", // seu grupo
};

// Lotes mock com datas de expiração
const LOTS = [
  { id: "lot1", name: "1º Lote", price: 25, capacity: 150, expiresAt: new Date(2025, 10, 25, 23, 59, 59) }, // 25 de novembro
  { id: "lot2", name: "2º Lote", price: 30, capacity: 200, expiresAt: new Date(2025, 11, 5, 23, 59, 59) }, // 5 de dezembro
  { id: "lot3", name: "3º Lote", price: 40, capacity: 250, expiresAt: new Date(2025, 11, 15, 23, 59, 59), womenPrice: 40, couplePrice: 60 }, // 15 de dezembro - Mulher: 40, Casal: 60
];

// Admin users mock
const ADMIN_USERS = [
  { id: 1, name: "Super Admin", role: "super-admin", email: "ceo@loop.com" },
  { id: 2, name: "Gestor Eventos", role: "gestor", email: "gestor@loop.com" },
  { id: 3, name: "Financeiro", role: "financeiro", email: "finance@loop.com" },
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
  const [lotsConfig, setLotsConfig] = useState(LOTS.map(lot => ({ ...lot, active: true })));

  useEffect(() => {
    setVagasDisplay(
      LOTS.map((l) => ({ lotId: l.id, vagas: getRandomVagas(l.capacity) }))
    );

    // Auth anônima para habilitar regras com auth != null
    signInAnonymously(auth).catch((err) => {
      console.log("Firebase anonymous auth error:", err?.message);
    });

    // Sincronização Firebase em tempo real
    const lotsRef = ref(database, 'lotsConfig');
    const unsubscribe = onValue(
      lotsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
          // Parse expiresAt back to Date for logic
          const parsed = data.map((lot) => ({
            ...lot,
            expiresAt: lot.expiresAt ? new Date(lot.expiresAt) : null,
          }));
          setLotsConfig(parsed);
        } else {
          // Seed inicial com configuração local caso não exista
          const initial = LOTS.map((lot) => ({
            ...lot,
            active: true,
            // Salvar como ISO string para compatibilidade
            expiresAt: lot.expiresAt instanceof Date ? lot.expiresAt.toISOString() : lot.expiresAt,
          }));
          set(lotsRef, initial).catch((e) => console.log('Seed write error:', e?.message));
          // Ajustar para Date na memória
          const parsedInitial = initial.map((lot) => ({ ...lot, expiresAt: new Date(lot.expiresAt) }));
          setLotsConfig(parsedInitial);
        }
      },
      (error) => {
        console.log("Firebase sync disabled or error:", error.message);
      }
    );

    return () => unsubscribe();
  }, []);

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
    const updatedConfig = lotsConfig.map(lot => 
      lot.id === lotId ? { ...lot, active: !lot.active } : lot
    );
    setLotsConfig(updatedConfig);
    
    // Salva no Firebase
    const lotsRef = ref(database, 'lotsConfig');
    set(lotsRef, updatedConfig).catch(err => {
      console.log("Firebase save error:", err.message);
    });
  }

  function updateLotPrice(lotId, field, value) {
    const updatedConfig = lotsConfig.map(lot => 
      lot.id === lotId ? { ...lot, [field]: parseFloat(value) || 0 } : lot
    );
    setLotsConfig(updatedConfig);
    
    // Salva no Firebase
    const lotsRef = ref(database, 'lotsConfig');
    set(lotsRef, updatedConfig).catch(err => {
      console.log("Firebase save error:", err.message);
    });
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
      ticketType: getTicketTypeLabel(),
      quantity: quantity,
      unitPrice: ticketPrice,
      totalPrice: totalPrice,
    };
    setOrder(payload);
    setShowCheckout(false);

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
      <header className="max-w-4xl mx-auto p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/social-loop-logo.jpg" alt="Social Loop Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-xl font-extrabold text-pink-500" style={{textShadow: '0 0 14px rgba(255,77,166,0.95)', color: '#ff4da6'}}>Loop Eventos</h1>
            <p className="text-xs text-purple-300">Petrolina • Eventos Exclusivos</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href={EVENT.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-md text-sm text-white" 
            style={{border: '1px solid rgba(255,77,166,0.2)', boxShadow: '0 0 10px rgba(255,77,166,0.1)', background: 'linear-gradient(90deg, rgba(255,77,166,0.1), rgba(124,77,255,0.1))'}}
            title="Seguir no Instagram"
          >
            📷 Instagram
          </a>
          <a
            href={EVENT.groupUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-md text-sm text-white" 
            style={{border: '1px solid rgba(124,77,255,0.2)', boxShadow: '0 0 10px rgba(124,77,255,0.1)', background: 'linear-gradient(90deg, rgba(124,77,255,0.1), rgba(255,77,166,0.1))'}}
            title="Entrar no grupo aberto"
          >
            💬 Grupo Aberto
          </a>
          <button
            onClick={() => setIsAdminOpen(true)}
            className="px-3 py-2 rounded-md text-sm text-white" 
            style={{border: '1px solid rgba(124,77,255,0.2)', boxShadow: '0 0 10px rgba(124,77,255,0.1)', background: 'linear-gradient(90deg, rgba(124,77,255,0.1), rgba(255,77,166,0.1))'}}
          >
            🔐 Admin
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl overflow-hidden shadow-lg p-4 mb-6"
        >
          <div className="flex flex-col gap-4 items-start">
            <div className="w-full">
              <h2 className="text-2xl font-black text-pink-500" style={{textShadow: '0 0 18px rgba(255,77,166,0.95)', color: '#ff4da6'}}>{EVENT.title}</h2>
              <p className="text-sm mt-2 text-blue-200">{EVENT.description}</p>
              <p className="text-xs mt-3 text-purple-300">{EVENT.venue} • {eventDate.toLocaleString()}</p>
            </div>

            <div className="w-full mt-4 flex flex-wrap gap-4">
              {lotsConfig.filter(lot => lot.active).map((lot) => {
                const vagas = vagasDisplay.find((v) => v.lotId === lot.id)?.vagas ?? 10;
                const isExpired = isLotExpired(lot);
                return (
                  <div key={lot.id} className="rounded-lg p-3 w-64" style={{background: isExpired ? 'rgba(10,10,10,0.3)' : 'rgba(10,10,10,0.6)', border: isExpired ? '1px solid rgba(100,100,100,0.2)' : '1px solid rgba(124,77,255,0.18)', boxShadow: '0 0 18px rgba(124,77,255,0.06)', opacity: isExpired ? 0.6 : 1}}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-pink-400" style={{textShadow:'0 0 8px rgba(255,77,166,0.8)'}}>{lot.name}</div>
                        <div className="text-xs text-blue-300" style={{textShadow:'0 0 6px rgba(124,77,255,0.7)'}}>R$ {lot.price}</div>
                        <div className="text-xs text-purple-300 mt-1">Até {formatExpirationDate(lot.expiresAt)}</div>
                      </div>
                    </div>

                    {isExpired && (
                      <div className="mt-2 p-2 bg-red-500/20 rounded text-xs text-red-300">
                        ⏰ Lote expirado
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      {lot.id === "lot3" ? (
                        <button
                          onClick={() => !isExpired && openCheckout(lot)}
                          disabled={isExpired}
                          className="flex-1 rounded-md px-3 py-2 font-bold text-sm" 
                          style={{
                            background: isExpired ? '#666666' : 'linear-gradient(90deg, #ff4da6, #7c4dff)', 
                            color: '#ffffff', 
                            boxShadow: isExpired ? 'none' : '0 0 20px rgba(124,77,255,0.35), 0 0 12px rgba(255,77,166,0.25)',
                            cursor: isExpired ? 'not-allowed' : 'pointer',
                            opacity: isExpired ? 0.5 : 1
                          }}
                        >
                          {isExpired ? 'Expirado' : '👤 Tipo Normal — R$ 40'}
                        </button>
                      ) : (
                        <button
                          onClick={() => !isExpired && openCheckout(lot)}
                          disabled={isExpired}
                          className="flex-1 rounded-md px-3 py-2 font-bold" 
                          style={{
                            background: isExpired ? '#666666' : 'linear-gradient(90deg, #ff4da6, #7c4dff)', 
                            color: '#ffffff', 
                            boxShadow: isExpired ? 'none' : '0 0 20px rgba(124,77,255,0.35), 0 0 12px rgba(255,77,166,0.25)',
                            cursor: isExpired ? 'not-allowed' : 'pointer',
                            opacity: isExpired ? 0.5 : 1
                          }}
                        >
                          {isExpired ? 'Expirado' : 'Quero Comprar'}
                        </button>
                      )}
                      {lot.id === "lot3" && (
                        <button
                          onClick={() => !isExpired && openCheckout(lot, "couple")}
                          disabled={isExpired}
                          className="flex-1 rounded-md px-3 py-2 font-bold text-sm" 
                          style={{
                            background: isExpired ? '#666666' : 'linear-gradient(90deg, #ff6b9d, #c77dff)',
                            color: '#ffffff',
                            boxShadow: isExpired ? 'none' : '0 0 15px rgba(255,107,157,0.4)',
                            cursor: isExpired ? 'not-allowed' : 'pointer',
                            opacity: isExpired ? 0.5 : 1
                          }}
                        >
                          {isExpired ? 'Expirado' : '💍 Tipo Casadinha — R$ 60'}
                        </button>
                      )}
                      {lot.id !== "lot3" && (
                        <button
                          onClick={() => !isExpired && openCheckout(lot, "woman")}
                          disabled={isExpired}
                          className="bg-transparent border border-white rounded-md px-3 py-2 text-sm text-white" 
                          style={{
                            textShadow:'0 0 10px rgba(255,77,166,0.8)',
                            cursor: isExpired ? 'not-allowed' : 'pointer',
                            opacity: isExpired ? 0.5 : 1,
                            borderColor: isExpired ? '#666666' : 'white'
                          }}
                        >
                          👩 Mulher 0800 — {isExpired ? 'Indisponível' : (isWomenFree() ? "FREE até 00:00" : `R$ ${lot.price}`)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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

        <footer className="text-center text-xs text-blue-300 py-8">© {new Date().getFullYear()} Loop Eventos — Petrolina</footer>
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-xl p-6 w-full max-w-md my-8" style={{background: 'linear-gradient(180deg, rgba(10,10,10,0.9), rgba(15,15,15,0.95))', boxShadow: '0 0 30px rgba(124,77,255,0.08)'}}>
            <h4 className="text-2xl font-bold mb-2 text-white" style={{textShadow:'0 0 10px rgba(255,77,166,0.8)'}}>Pedido — {selectedLot.name}</h4>
            <div className="bg-purple-500/20 rounded px-3 py-2 mb-4 border border-purple-500/40">
              <p className="text-sm text-purple-200"><strong>Tipo:</strong> {getTicketTypeLabel()} | <strong>Valor:</strong> {ticketType === "woman" && isWomenFree() ? "FREE" : `R$ ${getTicketPrice(selectedLot)}`}</p>
            </div>
            <p className="text-base text-purple-300 mb-4">Informe os dados de cada pessoa</p>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {ticketType !== "couple" && (
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-base text-white font-semibold">Quantidade de ingressos:</label>
                  <input type="number" min={1} value={quantity} onChange={(e) => handleQuantityChange(e.target.value)} className="w-20 p-2 rounded bg-gray-800 text-white" />
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">🔐 Painel Admin</h3>
              <button onClick={() => setIsAdminOpen(false)} className="text-3xl font-bold text-gray-400 hover:text-white transition" title="Fechar">✕</button>
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
                <div className="flex justify-between items-center mb-4">
                  <p className="text-purple-300">Bem-vindo, <strong>{adminUsername}</strong></p>
                  <button onClick={handleAdminLogout} className="text-sm px-3 py-1 rounded bg-red-600 hover:bg-red-700">Sair</button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 rounded">Ingressos vendidos (mock)<div className="text-2xl font-extrabold mt-2">{Math.floor(Math.random()*300)}</div></div>
                  <div className="bg-white/5 p-4 rounded">Receita (mock)<div className="text-2xl font-extrabold mt-2">R$ {Math.floor(Math.random()*8000)}</div></div>
                  <div className="bg-white/5 p-4 rounded">Vendas últimas 24h<div className="text-2xl font-extrabold mt-2">{Math.floor(Math.random()*120)}</div></div>
                </div>

                <div className="mt-6">
                  <h4 className="font-bold text-white mb-3">⚙️ Gerenciar Lotes</h4>
                  <div className="space-y-3">
                    {lotsConfig.map((lot) => (
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
                              value={lot.price} 
                              onChange={(e) => updateLotPrice(lot.id, 'price', e.target.value)}
                              className="w-full p-2 rounded bg-gray-800 text-white"
                            />
                          </div>
                          {lot.womenPrice && (
                            <div>
                              <label className="block text-xs text-purple-300 mb-1">Mulher 0800</label>
                              <input 
                                type="number" 
                                value={lot.womenPrice} 
                                onChange={(e) => updateLotPrice(lot.id, 'womenPrice', e.target.value)}
                                className="w-full p-2 rounded bg-gray-800 text-white"
                              />
                            </div>
                          )}
                          {lot.couplePrice && (
                            <div>
                              <label className="block text-xs text-purple-300 mb-1">Casadinha</label>
                              <input 
                                type="number" 
                                value={lot.couplePrice} 
                                onChange={(e) => updateLotPrice(lot.id, 'couplePrice', e.target.value)}
                                className="w-full p-2 rounded bg-gray-800 text-white"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs text-purple-300 mb-1">Capacidade</label>
                            <input 
                              type="number" 
                              value={lot.capacity} 
                              onChange={(e) => updateLotPrice(lot.id, 'capacity', e.target.value)}
                              className="w-full p-2 rounded bg-gray-800 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-bold text-white mb-3">👥 Usuários com acesso</h4>
                  <ul className="space-y-2">
                    {ADMIN_USERS.map((a) => (
                      <li key={a.id} className="bg-white/5 p-3 rounded flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white">{a.name}</div>
                          <div className="text-xs text-purple-300">{a.role} • {a.email}</div>
                        </div>
                        <div className="text-sm text-green-400">✓ Ativo</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex justify-end">
                  <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">📊 Exportar CSV</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
