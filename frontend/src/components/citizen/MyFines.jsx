import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  CheckCircle2,
  Lock, 
  Info, 
  AlertCircle,
  Clock,
  MapPin,
  ChevronRight,
  Shield,
  Zap,
  Building2,
  X,
  Car,
  CreditCard as CardIcon
} from 'lucide-react';

export default function MyFines() {
  const [fines, setFines] = useState([]);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [selectedFine, setSelectedFine] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1); // 1: Methods, 2: Confirm, 3: Success

  const fetchFines = async () => {
    try {
      const { data } = await axios.get('/api/fines');
      setFines(data);
    } catch (error) {
      console.error('Error loading fines:', error);
      toast.error('Failed to load real-time violation data');
    }
  };

  useEffect(() => {
    fetchFines();
    const socket = io('http://localhost:5001');
    socket.on('new-fine', () => fetchFines());
    socket.on('fine-updated', () => fetchFines());
    return () => socket.disconnect();
  }, []);

  const initiatePayment = (fine) => {
    setSelectedFine(fine);
    setPaymentStep(1);
    setShowPaymentGate(true);
  };

  const handleMockPayment = async () => {
    setIsProcessing(true);
    // Simulate payment transaction with municipal node
    setTimeout(async () => {
      try {
        if (!selectedFine._id.startsWith('mock-')) {
           await axios.post(`/api/fines/${selectedFine._id}/pay`);
        } else {
           // Local state update for mock fines
           setFines(prev => prev.map(f => f._id === selectedFine._id || (selectedFine.fineId === 'MULTIPLE' && f.status === 'pending') ? { ...f, status: 'paid' } : f));
        }
        setPaymentStep(3); // Show Success UI
        setIsProcessing(false);
        if (!selectedFine._id.startsWith('mock-')) fetchFines();
        toast.success('Municipal Settlement Complete');
      } catch (error) {
        toast.error('Payment processing failed');
        setIsProcessing(false);
      }
    }, 2500);
  };

  const totalOutstanding = fines
    .filter(f => f.status === 'pending')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="bg-[#F8FAFC] min-h-screen py-8 px-4 font-sans text-[#0F172A] relative">
      <div className="max-w-[1200px] mx-auto w-full">
        
        {/* Page Heading OS Style */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></div>
                 <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em]">Municipal Enforcement Grid Sync</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tighter leading-none">Fine <span className="text-blue-600">Settlement</span> Portal</h1>
              <p className="text-slate-400 font-bold mt-2">Manage and resolve traffic violations via secure government payment gateway.</p>
           </div>
           
           <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Status</p>
                 <p className="text-xs font-black text-emerald-600 uppercase">SSL-256 Encrypted</p>
              </div>
           </div>
        </div>

        {/* Summary High-Precision Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50/30 rounded-full blur-3xl -z-0"></div>
          <div className="relative z-10 text-center md:text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3">Total Payable Fine Currency [INR]</p>
            <h3 className="text-6xl md:text-8xl font-black text-[#EF4444] tabular-nums tracking-tighter leading-none flex items-center justify-center md:justify-start">
               <span className="text-2xl md:text-4xl text-slate-300 mr-2 uppercase font-medium">INR</span>
               {totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          
          <div className="flex flex-col gap-4 relative z-10 w-full md:w-auto">
             <button 
               onClick={() => totalOutstanding > 0 && initiatePayment({ amount: totalOutstanding, violationType: 'Bulk Settlement', fineId: 'MULTIPLE' })}
               className={`group bg-[#1A73E8] text-white px-12 py-6 rounded-[1.8rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3 ${totalOutstanding === 0 ? 'opacity-30 pointer-events-none' : ''}`}
             >
                Pay All Violations
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </button>
             <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified by Solapur Municipal Bank</p>
          </div>
        </div>

        {/* Fines List - Ultra Modern Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20">
           {fines.map((fine) => {
              const isPending = fine.status === 'pending';
              return (
                 <div key={fine._id} className={`group bg-white rounded-[2.2rem] p-8 border-2 transition-all duration-300 relative overflow-hidden ${isPending ? 'border-slate-50 hover:border-red-200' : 'border-emerald-50 opacity-80'}`}>
                    {/* Status Ribbon */}
                    <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl text-[9px] font-black uppercase tracking-[0.2em] ${isPending ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                       {fine.status}
                    </div>

                    <div className="flex items-start justify-between mb-8">
                       <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isPending ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                             {fine.violationType === 'high_speed' ? <Zap className="w-7 h-7" /> : fine.violationType === 'no_helmet' ? <Shield className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-[#0F172A] tracking-tight truncate max-w-[200px]">{fine.violationType.toUpperCase().replace(/_/g, ' ')}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fine.fineId}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className="text-2xl font-black text-[#0F172A]">₹{fine.amount}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-300" />
                          <span className="text-xs font-bold text-slate-500 truncate">{fine.location?.name || 'Solapur City'}</span>
                       </div>
                       <div className="flex items-center gap-2 justify-end">
                          <Clock className="w-4 h-4 text-slate-300" />
                          <span className="text-xs font-bold text-slate-500">{new Date(fine.issuedAt).toLocaleDateString()}</span>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                       <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                          <Car className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-black text-slate-700">{fine.vehicleNumber}</span>
                       </div>
                       
                       {isPending ? (
                          <button 
                             onClick={() => initiatePayment(fine)}
                             className="flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-100"
                          >
                             Payment Portal
                             <ChevronRight className="w-4 h-4" />
                          </button>
                       ) : (
                          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest px-4 py-2">
                             <CheckCircle className="w-4 h-4" />
                             Settled
                          </div>
                       )}
                    </div>
                 </div>
              );
           })}
        </div>

        {fines.length === 0 && (
           <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 italic">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-slate-400 font-black text-lg uppercase tracking-widest">No Violations Recorded</h3>
              <p className="text-slate-300 text-sm font-bold mt-1">Driving safely is its own reward.</p>
           </div>
        )}

      </div>

      {/* 🚀 THE RAZORPAY THEMED GATEWAY OVERLAY */}
      {showPaymentGate && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-0">
            <div className="absolute inset-0 bg-[#02042A]/90 backdrop-blur-md transition-opacity" onClick={() => !isProcessing && setShowPaymentGate(false)}></div>
            
            <div className="relative w-full max-w-[450px] bg-white rounded-3xl md:rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-slide-up">
               
               {/* Gateway Header */}
               <div className="bg-[#1D2547] text-white p-8 pb-12 relative overflow-hidden text-center">
                  <div className="absolute top-0 right-0 opacity-10"><Building2 className="w-40 h-40 translate-x-10 -translate-y-10" /></div>
                  <div className="flex justify-between items-center mb-8 relative z-10">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                           <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Municipal <span className="text-blue-400">Gateway</span></span>
                     </div>
                     <button onClick={() => !isProcessing && setShowPaymentGate(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <X className="w-6 h-6" />
                     </button>
                  </div>
                  
                  <div className="relative z-10">
                     <p className="text-[10px] font-black text-blue-300/80 uppercase tracking-[0.3em] mb-2 font-mono">Transaction Amount</p>
                     <h2 className="text-5xl font-black tracking-tighter">₹{selectedFine?.amount.toLocaleString()}</h2>
                  </div>
               </div>

               {/* Step 1: Methods */}
               {paymentStep === 1 && (
                  <div className="p-8 -mt-6 bg-white rounded-t-3xl relative z-20">
                     <div className="flex items-center gap-3 mb-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <Info className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-[10px] font-bold text-slate-500 leading-tight italic">Secure settlement via Solapur Municipal Grid Node #S{Math.floor(Math.random()*9000)+1000}</p>
                     </div>

                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Secure Payment Options</h5>
                     <div className="grid grid-cols-1 gap-3">
                        {[
                           { id: 'upi', label: 'UPI (GPay, PhonePe, BHIM)', icon: Smartphone, color: 'emerald' },
                           { id: 'card', label: 'Debit / Credit Card', icon: CreditCard, color: 'blue' },
                           { id: 'net', label: 'Net Banking', icon: Building2, color: 'indigo' }
                        ].map((method) => (
                           <button 
                              key={method.id} 
                              onClick={() => setPaymentStep(2)}
                              className="group flex items-center justify-between p-5 rounded-2xl border-2 border-slate-50 hover:border-blue-500 transition-all hover:bg-blue-50/10 shadow-sm hover:shadow-md"
                           >
                              <div className="flex items-center gap-4">
                                 <div className={`p-3 bg-slate-50 text-slate-600 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-all`}>
                                    <method.icon className="w-6 h-6" />
                                 </div>
                                 <span className="text-sm font-black text-slate-700">{method.label}</span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               {/* Step 2: Confirmation / Processing */}
               {paymentStep === 2 && (
                  <div className="p-12 -mt-6 bg-white rounded-t-3xl relative z-20 flex flex-col items-center text-center min-h-[400px] justify-center">
                     <div className="w-24 h-24 mb-8 relative">
                        <div className={`absolute inset-0 border-4 border-slate-50 rounded-full`}></div>
                        <div className={`absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin ${isProcessing ? 'opacity-100' : 'opacity-0'}`}></div>
                        <div className={`absolute inset-0 flex items-center justify-center ${!isProcessing ? 'scale-100' : 'scale-0'} transition-transform duration-500`}>
                           <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                              <Lock className="w-8 h-8 text-blue-600" />
                           </div>
                        </div>
                     </div>
                     
                     <h4 className="text-2xl font-black text-[#0F172A] mb-3">{isProcessing ? 'Verifying with Bank...' : 'Confirm Transaction'}</h4>
                     <p className="text-sm font-bold text-slate-400 mb-10 max-w-[280px] leading-relaxed">
                        {isProcessing ? 'Please do not navigate away or refresh the page while we authenticate your settlement.' : `You are about to settle violation ID ${selectedFine?.fineId} for ₹${selectedFine?.amount}.`}
                     </p>

                     {!isProcessing && (
                        <div className="w-full flex flex-col gap-4">
                           <button 
                              onClick={handleMockPayment}
                              className="w-full py-6 bg-[#1A73E8] text-white rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all"
                           >
                              Settle Violation Now
                           </button>
                           <button 
                              onClick={() => setPaymentStep(1)}
                              className="text-xs font-black text-slate-300 uppercase tracking-widest hover:text-red-500 transition-colors"
                           >
                              Back to methods
                           </button>
                        </div>
                     )}
                  </div>
               )}

               {/* Step 3: Success */}
               {paymentStep === 3 && (
                  <div className="p-12 -mt-6 bg-white rounded-t-3xl relative z-20 flex flex-col items-center text-center">
                     <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 shadow-inner animate-bounce">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                     </div>
                     <h4 className="text-3xl font-black text-[#0F172A] mb-3">Settlement Successful</h4>
                     <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed">Your violation record has been cleared from the <span className="text-[#0F172A]">Solapur Municipal Enforcement Grid</span>. A digital receipt has been sent to your registered email.</p>
                     
                     <div className="bg-slate-50 w-full p-5 rounded-2xl mb-10 flex items-center justify-between border border-slate-100">
                        <div className="text-left">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt Number</p>
                           <p className="text-xs font-black text-[#0F172A] font-mono">RCPT-{Date.now().toString().slice(-8)}</p>
                        </div>
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                           <ShieldCheck className="w-6 h-6" />
                        </div>
                     </div>

                     <button 
                        onClick={() => setShowPaymentGate(false)}
                        className="w-full py-6 bg-[#0F172A] text-white rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-200 active:scale-95 transition-all"
                     >
                        Close Settlement Portal
                     </button>
                  </div>
               )}

               {/* Secure Footer */}
               <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-center gap-6">
                  <div className="flex items-center gap-1.5 grayscale opacity-30">
                     <div className="w-8 h-5 bg-white border rounded flex items-center justify-center text-[8px] font-black">VISA</div>
                     <div className="w-8 h-5 bg-white border rounded flex items-center justify-center text-[8px] font-black italic">UPI</div>
                  </div>
                  <div className="h-4 w-[1px] bg-slate-200"></div>
                  <div className="flex items-center gap-3">
                     <Lock className="w-3 h-3 text-emerald-500" />
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">AES-256 Bit Encryption</span>
                  </div>
               </div>
            </div>
         </div>
      )}

      <style jsx="true">{`
        @keyframes slide-up {
           from { transform: translateY(100%); opacity: 0; }
           to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

    </div>
  );
}
