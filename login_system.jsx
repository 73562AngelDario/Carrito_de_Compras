import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection 
} from 'firebase/firestore';
import { Bike, ShieldCheck, AlertCircle, Loader2, LogOut, Package } from 'lucide-react';

// Configuración de Firebase obtenida del entorno
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'delivery-app-pro';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('login'); // 'login' | 'dashboard'

  // Inicialización de Autenticación y Persistencia
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Asegurar que la sesión se guarde en el navegador
        await setPersistence(auth, browserLocalPersistence);
        
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (err) {
        console.error("Error en configuración inicial:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setView('dashboard');
      } else {
        setUser(null);
        setView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Intentar inicio de sesión con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const loggedUser = userCredential.user;

      // 2. Verificar o Crear Perfil en Firestore (Ruta obligatoria por reglas de seguridad)
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', loggedUser.uid);
      
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (fetchErr) {
        console.error("Error al leer perfil:", fetchErr);
        // Si falla la lectura, intentamos crear el perfil por si es nuevo
      }

      if (!userSnap || !userSnap.exists()) {
        // Si la cuenta es nueva o no tiene documento, lo creamos con rol admin
        await setDoc(userRef, {
          email: loggedUser.email,
          role: 'admin',
          uid: loggedUser.uid,
          lastLogin: new Date().toISOString(),
          status: 'active'
        });
      } else {
        // Actualizar fecha de último acceso
        await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
      }

      setView('dashboard');
    } catch (err) {
      console.error("Error de login completo:", err);
      
      // Mensajes de error más amigables basados en el código de Firebase
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Usuario o contraseña incorrectos. Por favor, verifica tus datos.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Demasiados intentos fallidos. La cuenta se ha bloqueado temporalmente.");
      } else {
        setError("Error de acceso: No se pudo verificar tu rol de Administrador.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setView('login');
      setEmail('');
      setPassword('');
      setError(null);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  // Vista del Panel de Control
  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md text-center border border-stone-100">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldCheck className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Panel Activo</h1>
          <p className="text-stone-500 text-sm mb-8 font-medium">{user?.email}</p>
          
          <div className="grid grid-cols-1 gap-4 w-full">
            <button className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white rounded-2xl hover:bg-[#8b2e2e] transition-all group">
              <span className="font-bold tracking-wide">Gestionar Pedidos</span>
              <Package className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-4 text-red-600 font-bold hover:bg-red-50 rounded-2xl transition-colors"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-stone-100">
            <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em]">Sistema de Reparto v2.4</p>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Login
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{ 
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)), url("https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop")',
        backgroundColor: '#1a1a1a'
      }}
    >
      {/* Modal de Error Estilo Captura */}
      {error && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center pt-24 z-50 px-4 backdrop-blur-sm">
          <div className="bg-[#1e252b] text-white p-8 rounded-3xl max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 transform animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-400 w-6 h-6" />
              <h3 className="text-xl font-bold">Aviso del Sistema</h3>
            </div>
            <p className="text-sm text-neutral-300 mb-8 leading-relaxed font-medium">
              {error}
            </p>
            <button 
              onClick={() => setError(null)}
              className="w-full py-3.5 bg-[#82cfc0] hover:bg-[#6ebaa9] text-black font-black rounded-xl transition-all shadow-lg active:scale-95"
            >
              ACEPTAR
            </button>
          </div>
        </div>
      )}

      {/* Tarjeta de Login Principal */}
      <div className="bg-white rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-[420px] p-12 flex flex-col items-center border border-white/20">
        <div className="w-28 h-28 bg-[#8b2e2e] rounded-full flex items-center justify-center shadow-2xl mb-8 transform hover:rotate-12 transition-transform duration-500">
          <Bike size={56} color="white" strokeWidth={1.2} />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-5xl font-serif font-bold text-stone-900 mb-2 tracking-tight">Repartidor</h1>
          <div className="h-1 w-12 bg-[#8b2e2e] mx-auto rounded-full mb-3"></div>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-[0.3em]">Acceso Administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase ml-4 tracking-widest">Correo Electrónico</label>
            <input
              type="email"
              placeholder="admin@empresa.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-[#8b2e2e]/10 focus:border-[#8b2e2e] transition-all text-stone-800 font-medium placeholder:text-stone-300"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase ml-4 tracking-widest">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-[#8b2e2e]/10 focus:border-[#8b2e2e] transition-all text-stone-800 font-medium placeholder:text-stone-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8b2e2e] hover:bg-[#722626] disabled:bg-stone-300 text-white font-black py-5 rounded-[1.5rem] mt-6 shadow-2xl shadow-[#8b2e2e]/40 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (

          
              "ENTRAR AL TURNO"
            )}
          </button>
        </form>

        <footer className="mt-14 text-[9px] text-stone-300 tracking-[0.4em] uppercase font-bold">
          Delicias de Campeche • 2024
        </footer>
      </div>
    </div>
  );
}