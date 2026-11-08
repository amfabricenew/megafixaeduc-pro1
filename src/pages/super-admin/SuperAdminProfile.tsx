import React from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Save, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Key
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SuperAdminProfile() {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/super-admin/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nom: user.nom,
          email: user.email
        })
      });
      if (response.ok) {
        toast.success("Profil mis à jour avec succès");
      } else {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/super-admin/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(passwordData)
      });
      if (response.ok) {
        toast.success("Mot de passe modifié avec succès");
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        toast.error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
        <p className="text-slate-500">Gérez vos informations personnelles et la sécurité de votre compte.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-full mx-auto flex items-center justify-center text-indigo-600 font-black text-3xl mb-4 border-4 border-white shadow-md">
              {user?.nom?.charAt(0) || <User size={40} />}
            </div>
            <h3 className="font-bold text-slate-900">{user?.nom}</h3>
            <p className="text-xs text-slate-500 mt-1">{user?.role?.replace('_', ' ').toUpperCase()}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Compte vérifié</span>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="relative z-10">
              <Shield className="text-indigo-400 mb-4" size={32} />
              <h4 className="font-bold">Protection 2FA</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Ajoutez une couche de sécurité supplémentaire à votre compte en activant l'authentification à deux facteurs.
              </p>
              <button className="mt-4 w-full py-2 bg-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">
                Activer maintenant
              </button>
            </div>
            <Key className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-all" size={120} />
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          {/* Personal Info */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <User size={20} className="text-indigo-600" />
              <h3 className="font-bold text-slate-900">Informations Personnelles</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={user?.nom || ''} 
                      onChange={(e) => setUser({...user, nom: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Adresse Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      value={user?.email || ''} 
                      onChange={(e) => setUser({...user, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  <Save size={18} />
                  Enregistrer
                </button>
              </div>
            </form>
          </section>

          {/* Password Change */}
          <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Lock size={20} className="text-rose-600" />
              <h3 className="font-bold text-slate-900">Changer le Mot de Passe</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Mot de passe actuel</label>
                <input 
                  type="password" 
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nouveau mot de passe</label>
                  <input 
                    type="password" 
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Confirmer le nouveau mot de passe</label>
                  <input 
                    type="password" 
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  <Lock size={18} />
                  Mettre à jour le mot de passe
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
