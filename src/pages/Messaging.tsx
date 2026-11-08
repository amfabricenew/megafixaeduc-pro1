import React from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import {
  MessageSquare,
  Send,
  Users,
  Search,
  Phone,
  Mail,
  User,
  GraduationCap,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Radio,
  History,
  Settings,
  Filter,
  Check,
  RefreshCw,
  Sparkles,
  Inbox,
  UserCheck,
  Paperclip,
  CheckCheck,
  Volume2,
  Mic,
  MicOff,
  X,
  Play,
  Pause,
  FileText,
  File,
  Download,
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { InternalMessage, ConversationParticipant, SmsLog, SmsConfig } from '../types';
import GmailInboxView from '../components/GmailInboxView';

// Custom Audio Player with Play / Pause button for voice messages
function VoicePlayer({ audioUrl, isMine }: { audioUrl: string; isMine?: boolean }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      audioRef.current.play()
        .then(() => setIsLoading(false))
        .catch(err => {
          setIsLoading(false);
          console.warn("Audio play notice:", err);
          toast.error("Impossible de lire l'enregistrement vocal.");
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`mt-1.5 p-2.5 rounded-xl border flex flex-col gap-1.5 w-full max-w-[280px] sm:max-w-[320px] shadow-xs select-none transition-all ${
      isMine 
        ? 'bg-emerald-800/70 border-emerald-500/70 text-white' 
        : 'bg-white/95 border-slate-200 text-slate-800'
    }`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => { setIsPlaying(true); setIsLoading(false); }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <div className="flex items-center gap-2.5">
        {/* Prominent Play / Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-sm ${
            isMine 
              ? 'bg-white text-emerald-700 hover:bg-emerald-50 hover:scale-105' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'
          }`}
          title={isPlaying ? "Mettre en pause" : "Lire le vocal"}
          aria-label={isPlaying ? "Pause vocal" : "Lire vocal"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Progress bar and time display */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
              isMine 
                ? 'accent-white bg-emerald-950/50' 
                : 'accent-emerald-600 bg-slate-200'
            }`}
          />
          <div className={`flex items-center justify-between text-[10px] font-mono font-medium ${
            isMine ? 'text-emerald-100' : 'text-slate-500'
          }`}>
            <span>{formatAudioTime(currentTime)}</span>
            <span>{duration > 0 ? formatAudioTime(duration) : '0:00'}</span>
          </div>
        </div>

        {/* Playback speed toggle (1x / 1.5x / 2x) */}
        <button
          type="button"
          onClick={cycleSpeed}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 transition-colors ${
            isMine 
              ? 'bg-emerald-950/50 hover:bg-emerald-950 text-emerald-100' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Modifier la vitesse de lecture (1x, 1.5x, 2x)"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}

export default function Messaging() {
  const { user } = useAuth();
  const confirm = useConfirm();

  // Active view: 'conversations' | 'sms_direct' | 'sms_logs' | 'sms_settings' | 'gmail'
  const [activeTab, setActiveTab] = React.useState<'conversations' | 'sms_direct' | 'sms_logs' | 'sms_settings' | 'gmail'>('conversations');

  // Contact list and groups
  const [contacts, setContacts] = React.useState<{
    users: any[];
    classes: any[];
    parents: any[];
    unreadCount: number;
  }>({ users: [], classes: [], parents: [], unreadCount: 0 });
  const [loadingContacts, setLoadingContacts] = React.useState(true);

  // Selected chat target
  const [selectedTarget, setSelectedTarget] = React.useState<{
    type: 'user' | 'all_teachers' | 'all_parents' | 'class_parents' | 'role_direction';
    id?: number;
    name: string;
    role?: string;
    classe_id?: number;
    telephone?: string;
  } | null>(null);

  // Messages in current thread
  const [messages, setMessages] = React.useState<InternalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);

  const [messageContent, setMessageContent] = React.useState('');
  const [messageSubject, setMessageSubject] = React.useState('');
  const [sendWithSms, setSendWithSms] = React.useState(false);
  const [sendWithEmail, setSendWithEmail] = React.useState(false);
  const [sendingMessage, setSendingMessage] = React.useState(false);

  // Filter & Search in contacts
  const [contactSearch, setContactSearch] = React.useState('');
  const [contactFilter, setContactFilter] = React.useState<'all' | 'teachers' | 'admin' | 'classes'>('all');

  // Direct SMS Broadcaster form
  const [smsDirectCategory, setSmsDirectCategory] = React.useState<'parents' | 'teachers' | 'class' | 'custom'>('parents');
  const [smsDirectClassId, setSmsDirectClassId] = React.useState<string>('');
  const [smsDirectCustomPhone, setSmsDirectCustomPhone] = React.useState('');
  const [smsDirectCustomName, setSmsDirectCustomName] = React.useState('');
  const [smsDirectContent, setSmsDirectContent] = React.useState('');
  const [sendingDirectSms, setSendingDirectSms] = React.useState(false);

  // SMS Logs & Stats
  const [smsLogs, setSmsLogs] = React.useState<SmsLog[]>([]);
  const [smsStats, setSmsStats] = React.useState<any>(null);
  const [loadingSmsLogs, setLoadingSmsLogs] = React.useState(false);

  // SMS Configuration
  const [smsConfig, setSmsConfig] = React.useState<SmsConfig>({
    school_id: 1,
    provider: 'simulation',
    is_active: 1,
    account_sid: '',
    auth_token: '',
    sender_number_or_name: 'MEGAFIXA',
    credit_balance: 1000
  });
  const [savingSmsConfig, setSavingSmsConfig] = React.useState(false);
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = React.useState<string | number>('all');

  // Voice states
  const [listeningTarget, setListeningTarget] = React.useState<'internal' | 'sms' | null>(null);
  const isListening = !!listeningTarget;
  const [speakingMsgId, setSpeakingMsgId] = React.useState<number | string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  // Audio recording and upload states
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [uploadingFile, setUploadingFile] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const recordingIntervalRef = React.useRef<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isCancelledRef = React.useRef(false);

  // Quick SMS Templates
  const smsTemplates = [
    { title: 'Absence non justifiée', text: 'Chers parents, nous vous informons que votre enfant est absent ce jour sans justification préalable. Merci de contacter la vie scolaire.' },
    { title: 'Rappel Échéance Scolarité', text: 'Chers parents, nous vous rappelons que l\'échéance des frais de scolarité arrive à terme. Merci de régulariser la situation.' },
    { title: 'Réunion Pédagogique', text: 'Chers collègues, une réunion pédagogique est prévue ce vendredi à 15h00 en salle des professeurs. Présence vivement souhaitée.' },
    { title: 'Publication des Bulletins', text: 'Chers parents, les bulletins de notes du trimestre sont disponibles sur la plateforme et prêts à être retirés.' }
  ];

  // Auto-scroll anchor
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await apiFetch('/api/messagerie/contacts');
      if (res.ok) {
        const data = await res.json();
        const safeData = {
          users: Array.isArray(data?.users) ? data.users : [],
          classes: Array.isArray(data?.classes) ? data.classes : [],
          parents: Array.isArray(data?.parents) ? data.parents : [],
          unreadCount: typeof data?.unreadCount === 'number' ? data.unreadCount : 0
        };
        setContacts(safeData);
        // Default select first user or channel if none selected
        if (!selectedTarget && safeData.users.length > 0) {
          setSelectedTarget({
            type: 'user',
            id: safeData.users[0].id,
            name: safeData.users[0].name,
            role: safeData.users[0].role,
            telephone: safeData.users[0].telephone
          });
        }
      }
    } catch (err: any) {
      console.error("Fetch contacts error:", err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Fetch messages for active selected target
  const fetchThreadMessages = async (target = selectedTarget) => {
    if (!target) return;
    try {
      setLoadingMessages(true);
      let query = '';
      if (target.type === 'user' && target.id) {
        query = `?contactId=${target.id}`;
      } else if (target.type === 'class_parents' && target.classe_id) {
        query = `?recipientType=class_parents&classeId=${target.classe_id}`;
      } else if (target.type === 'all_teachers') {
        query = `?recipientType=all_teachers`;
      } else if (target.type === 'all_parents') {
        query = `?recipientType=all_parents`;
      } else if (target.type === 'role_direction') {
        query = `?recipientType=role&recipientRole=direction`;
      }

      const res = await apiFetch(`/api/messagerie/messages${query}${query ? '&' : '?'}annee_id=${selectedYearId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err: any) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch SMS Logs
  const fetchSmsLogs = async () => {
    try {
      setLoadingSmsLogs(true);
      const url = selectedYearId !== 'all' ? `/api/sms/logs?annee_id=${selectedYearId}` : '/api/sms/logs';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setSmsLogs(data.logs || []);
        setSmsStats(data.stats || null);
      }
    } catch (err: any) {
      console.error("Fetch SMS logs error:", err);
    } finally {
      setLoadingSmsLogs(false);
    }
  };

  // Fetch SMS Configuration
  const fetchSmsConfig = async () => {
    try {
      const res = await apiFetch('/api/sms/config');
      if (res.ok) {
        const data = await res.json();
        if (data) setSmsConfig(data);
      }
    } catch (err: any) {
      console.error("Fetch SMS config error:", err);
    }
  };

  React.useEffect(() => {
    fetchContacts();
    fetchSmsConfig();
  }, []);

  React.useEffect(() => {
    if (selectedTarget) {
      fetchThreadMessages(selectedTarget);
    }
  }, [selectedTarget, selectedYearId]);

  React.useEffect(() => {
    if (activeTab === 'sms_logs') {
      fetchSmsLogs();
    }
  }, [activeTab, selectedYearId]);

  // Periodic polling for new messages
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'conversations' && selectedTarget) {
        fetchThreadMessages(selectedTarget);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab, selectedTarget]);

  // Clean up speech synthesis & speech recognition on component unmount
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedTarget) return;

    try {
      setSendingMessage(true);
      const payload: any = {
        content: messageContent.trim(),
        subject: messageSubject.trim(),
        send_sms: sendWithSms,
        send_email: sendWithEmail
      };

      if (selectedTarget.type === 'user') {
        payload.recipient_type = 'user';
        payload.recipient_id = selectedTarget.id;
      } else if (selectedTarget.type === 'class_parents') {
        payload.recipient_type = 'class_parents';
        payload.classe_id = selectedTarget.classe_id;
      } else if (selectedTarget.type === 'all_teachers') {
        payload.recipient_type = 'all_teachers';
      } else if (selectedTarget.type === 'all_parents') {
        payload.recipient_type = 'all_parents';
      } else if (selectedTarget.type === 'role_direction') {
        payload.recipient_type = 'role';
        payload.recipient_role = 'direction';
      }

      const res = await apiFetch('/api/messagerie/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setMessageContent('');
        setMessageSubject('');
        setSendWithSms(false);
        setSendWithEmail(false);
        const emailMsg = data.emailResult?.sent ? ` • ${data.emailResult.sent} email(s) réel(s) expédié(s)` : '';
        const smsMsg = data.smsResult?.sent ? ` • ${data.smsResult.sent} SMS envoyé(s)` : '';
        toast.success(`Message expédié avec succès !${emailMsg}${smsMsg}`);
        fetchThreadMessages(selectedTarget);
        fetchContacts();
      } else {
        const err = await res.json();
        toast.error(err.error || "Échec de l'envoi du message.");
      }
    } catch (err: any) {
      toast.error("Erreur réseau: " + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  // Direct SMS broadcaster handler
  const handleSendDirectSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsDirectContent.trim()) {
      toast.error("Veuillez saisir le contenu du SMS.");
      return;
    }

    let recipientsList: any[] = [];
    const parentsList = Array.isArray(contacts?.parents) ? contacts.parents : [];
    const usersList = Array.isArray(contacts?.users) ? contacts.users : [];
    if (smsDirectCategory === 'parents') {
      recipientsList = parentsList.filter(p => p.telephone).map(p => ({
        name: p.name || 'Parent',
        phone: p.telephone,
        type: 'parent'
      }));
    } else if (smsDirectCategory === 'teachers') {
      recipientsList = usersList.filter(u => u.role === 'enseignant' && u.telephone).map(u => ({
        name: u.name,
        phone: u.telephone,
        type: 'enseignant'
      }));
    } else if (smsDirectCategory === 'class' && smsDirectClassId) {
      recipientsList = parentsList.filter(p => String(p.classe_id) === String(smsDirectClassId) && p.telephone).map(p => ({
        name: p.name || 'Parent',
        phone: p.telephone,
        type: 'parent'
      }));
    } else if (smsDirectCategory === 'custom') {
      if (!smsDirectCustomPhone) {
        toast.error("Veuillez renseigner le numéro de téléphone.");
        return;
      }
      recipientsList = [{
        name: smsDirectCustomName || 'Destinataire',
        phone: smsDirectCustomPhone,
        type: 'personnalisé'
      }];
    }

    if (recipientsList.length === 0) {
      toast.error("Aucun numéro de téléphone valide trouvé pour ce groupe.");
      return;
    }

    const isConfirmed = await confirm({
      title: "Confirmer l'envoi du SMS",
      message: `Êtes-vous sûr de vouloir envoyer ce SMS à ${recipientsList.length} destinataire(s) ?`,
      confirmText: "Envoyer les SMS",
      cancelText: "Annuler",
      type: "info"
    });

    if (!isConfirmed) return;

    try {
      setSendingDirectSms(true);
      const res = await apiFetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientsList,
          message: smsDirectContent.trim(),
          category: smsDirectCategory
        })
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`SMS envoyés: ${result.sent} avec succès (${result.failed} échoués)`);
        setSmsDirectContent('');
        if (smsDirectCategory === 'custom') {
          setSmsDirectCustomPhone('');
          setSmsDirectCustomName('');
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'envoi groupé du SMS.");
      }
    } catch (err: any) {
      toast.error("Erreur serveur: " + err.message);
    } finally {
      setSendingDirectSms(false);
    }
  };

  // Save SMS Gateway config
  const handleSaveSmsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSmsConfig(true);
      const res = await apiFetch('/api/sms/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsConfig)
      });

      if (res.ok) {
        toast.success("Configuration SMS sauvegardée avec succès !");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'enregistrement de la passerelle.");
      }
    } catch (err: any) {
      toast.error("Erreur réseau: " + err.message);
    } finally {
      setSavingSmsConfig(false);
    }
  };

  // --- Voice Features ---

  // Text-to-Speech: Listen to a message
  const speakMessage = (msg: InternalMessage) => {
    if (!('speechSynthesis' in window)) {
      toast.error("La synthèse vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (speakingMsgId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = `${msg.sender_name} a écrit : ${msg.content}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'fr-FR';
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    
    setSpeakingMsgId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  // Speech-to-Text: Dictate message
  const toggleDictation = async (target: 'internal' | 'sms') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("La reconnaissance vocale n'est pas supportée par votre navigateur (navigateur recommandé : Google Chrome).");
      return;
    }

    // If currently listening to this target, stop dictation
    if (listeningTarget === target) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // ignore
      }
      setListeningTarget(null);
      return;
    }

    // Stop any existing recognition session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setListeningTarget(target);
        toast.success("Microphone activé : dictez votre message...", { icon: '🎙️' });
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          if (target === 'internal') {
            setMessageContent(prev => prev + (prev ? ' ' : '') + finalTranscript);
          } else {
            setSmsDirectContent(prev => prev + (prev ? ' ' : '') + finalTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event?.error);
        setListeningTarget(null);
        if (event?.error === 'not-allowed') {
          const isIframe = typeof window !== 'undefined' && window.self !== window.top;
          if (isIframe) {
            toast.error("Accès micro restreint par le cadre de prévisualisation (iframe). Pour la dictée, ouvrez l'application dans un onglet dédié ou écrivez directement.");
          } else {
            toast.error("Accès au microphone bloqué par le navigateur. Veuillez autoriser le micro via l'icône de cadenas/caméra de la barre d'adresse.");
          }
        } else if (event?.error === 'no-speech') {
          toast("Aucune voix détectée. Vous pouvez reprendre la dictée en cliquant sur le micro.", { icon: '🎙️' });
        } else if (event?.error === 'audio-capture') {
          toast.error("Aucun microphone disponible pour la capture audio.");
        } else if (event?.error === 'network') {
          toast.error("Erreur de connexion au service vocal.");
        } else if (event?.error === 'aborted') {
          // User aborted, no error display needed
        } else {
          toast.error(`Reconnaissance vocale : ${event?.error || 'interrompue'}`);
        }
      };

      recognition.onend = () => {
        setListeningTarget(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn("SpeechRecognition start notice:", err);
      setListeningTarget(null);
      toast.error("Impossible de lancer la reconnaissance vocale.");
    }
  };

  // --- Audio Recording (WhatsApp-like Voice Messages) ---
  const startRecording = async () => {
    if (!selectedTarget) {
      toast.error("Veuillez d'abord sélectionner un destinataire ou une conversation.");
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error("L'enregistrement vocal direct n'est pas supporté par ce navigateur. Vous pouvez joindre un fichier audio avec le bouton 'Sélectionner un audio'.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        }
      }

      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType }) 
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Release audio stream
        stream.getTracks().forEach(track => track.stop());

        if (isCancelledRef.current) {
          isCancelledRef.current = false;
          audioChunksRef.current = [];
          return;
        }

        const effectiveMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: effectiveMime });

        if (audioBlob.size < 50) {
          toast.error("Enregistrement vocal vide ou trop court.");
          return;
        }

        const uploadToast = toast.loading("Envoi du message vocal...");
        const fileExt = effectiveMime.includes('mp4') ? 'm4a' : effectiveMime.includes('ogg') ? 'ogg' : 'webm';

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Audio = reader.result as string;
            if (!base64Audio) {
              toast.error("Échec de préparation du fichier vocal.", { id: uploadToast });
              return;
            }

            const res = await apiFetch('/api/messagerie/upload-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioData: base64Audio,
                fileName: `voice_${Date.now()}.${fileExt}`
              })
            });

            if (res.ok) {
              const data = await res.json();
              await sendVoiceMessage(data.url, uploadToast);
            } else {
              const errData = await res.json().catch(() => ({}));
              toast.error(errData.error || errData.message || "Erreur lors du téléversement du message vocal.", { id: uploadToast });
            }
          } catch (err: any) {
            console.warn("Audio upload warning:", err);
            toast.error(err?.message || "Échec de l'envoi du message vocal.", { id: uploadToast });
          }
        };

        reader.onerror = () => {
          toast.error("Erreur de conversion audio.", { id: uploadToast });
        };

        reader.readAsDataURL(audioBlob);
      };

      // Produce data slices every 250ms for responsive stop
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Mic access notice:", err?.name || err?.message || err);
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.message?.toLowerCase().includes('permission denied')) {
        if (isIframe) {
          toast.error("Accès micro restreint par le cadre d'affichage (iframe). Vous pouvez utiliser le bouton 'Sélectionner un audio' pour joindre un enregistrement ou ouvrir l'app en plein écran.", { duration: 6500 });
        } else {
          toast.error("Accès au microphone refusé. Vérifiez l'autorisation dans les paramètres de votre navigateur ou utilisez le bouton 'Sélectionner un audio'.", { duration: 6000 });
        }
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        toast.error("Aucun microphone détecté sur cet appareil. Utilisez 'Sélectionner un audio' pour joindre un fichier.");
      } else {
        toast.error("Impossible d'accéder au microphone. Utilisez 'Sélectionner un audio' pour joindre un fichier.");
      }
    }
  };

  // Upload any file as an attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedTarget) {
      toast.error("Veuillez d'abord sélectionner un destinataire.");
      if (e.target) e.target.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 50 Mo.");
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingFile(true); // Reusing state for simplicity or I could rename it
    const toastId = toast.loading("Envoi du fichier en cours...");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          if (!base64Data) {
            toast.error("Fichier non lisible.", { id: toastId });
            return;
          }

          const res = await apiFetch('/api/messagerie/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64Data,
              fileName: file.name
            })
          });

          if (res.ok) {
            const data = await res.json();
            // Send message with the returned URL as an attachment
            await sendMessageWithAttachment(data.url, file.name, toastId);
          } else {
            const errData = await res.json().catch(() => ({}));
            toast.error(errData.error || errData.message || "Erreur lors de l'envoi du fichier.", { id: toastId });
          }
        } catch (err: any) {
          console.warn("Upload file notice:", err);
          toast.error(err?.message || "Échec du téléversement du fichier.", { id: toastId });
        } finally {
          setUploadingFile(false);
          if (e.target) e.target.value = '';
        }
      };
      reader.onerror = () => {
        toast.error("Erreur de lecture du fichier.", { id: toastId });
        setUploadingFile(false);
        if (e.target) e.target.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.warn("File upload err:", err);
      toast.error("Impossible de charger le fichier.", { id: toastId });
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const sendMessageWithAttachment = async (url: string, name: string, toastId?: string) => {
    if (!selectedTarget) return;
    try {
      setSendingMessage(true);
      const payload: any = {
        content: `[Fichier joint: ${name}]`,
        attachment_url: url,
        attachment_name: name,
        recipient_type: selectedTarget.type === 'user' ? 'user' : selectedTarget.type,
        send_sms: sendWithSms
      };

      if (selectedTarget.type === 'user') payload.recipient_id = selectedTarget.id;
      else if (selectedTarget.type === 'class_parents') payload.classe_id = selectedTarget.classe_id;
      else if (selectedTarget.type === 'role_direction') {
        payload.recipient_type = 'role';
        payload.recipient_role = 'direction';
      }

      const res = await apiFetch('/api/messagerie/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (toastId) toast.success("Fichier envoyé avec succès !", { id: toastId });
        fetchThreadMessages(selectedTarget);
        fetchContacts();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur lors de l'envoi du fichier.", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Erreur de connexion.", { id: toastId });
    } finally {
      setSendingMessage(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancelledRef.current = true;
      audioChunksRef.current = []; // Clear chunks so onstop does nothing
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast("Enregistrement vocal annulé", { icon: '🗑️' });
    }
  };

  const sendVoiceMessage = async (audioUrl: string, toastId?: string) => {
    if (!selectedTarget) return;
    try {
      setSendingMessage(true);
      const payload: any = {
        content: "[Message Vocal]",
        audio_url: audioUrl,
        recipient_type: selectedTarget.type === 'user' ? 'user' : selectedTarget.type,
        send_sms: sendWithSms
      };

      if (selectedTarget.type === 'user') payload.recipient_id = selectedTarget.id;
      else if (selectedTarget.type === 'class_parents') payload.classe_id = selectedTarget.classe_id;
      else if (selectedTarget.type === 'role_direction') {
        payload.recipient_type = 'role';
        payload.recipient_role = 'direction';
      }

      const res = await apiFetch('/api/messagerie/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (toastId) {
          toast.success("Message vocal envoyé avec succès !", { id: toastId });
        } else {
          toast.success("Message vocal envoyé avec succès !");
        }
        fetchThreadMessages(selectedTarget);
        fetchContacts();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || err.message || "Erreur lors de l'envoi du message vocal.";
        if (toastId) {
          toast.error(msg, { id: toastId });
        } else {
          toast.error(msg);
        }
      }
    } catch (err: any) {
      console.error("Send voice message error:", err);
      const msg = err?.message || "Erreur de connexion lors de l'envoi du vocal.";
      if (toastId) {
        toast.error(msg, { id: toastId });
      } else {
        toast.error(msg);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered contacts list
  const isTeacher = user?.role === 'enseignant';
  const isUserAdmin = user?.role === 'admin' || user?.role === 'direction' || user?.role === 'super_admin' || user?.role === 'fonde';

  const filteredUsers = contacts.users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
                        (u.telephone && u.telephone.includes(contactSearch));
    if (!matchSearch) return false;
    if (contactFilter === 'teachers') return u.role === 'enseignant';
    if (contactFilter === 'admin') return ['admin', 'super_admin', 'fonde', 'direction', 'censeur', 'surveillant', 'secretariat', 'comptable'].includes(u.role);
    return true;
  });

  return (
    <div id="messaging-module" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {isTeacher ? "Messagerie des Enseignants" : "Messagerie & Diffusion SMS"}
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
                {isTeacher ? "Administration & Enseignants" : "Multi-Canaux"}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {isTeacher 
                ? "Canal d'échanges sécurisé réservé à la communication avec l'administration et l'ensemble des enseignants."
                : "Communication instantanée entre enseignants, administration, et notifications SMS aux parents."}
            </p>
          </div>
        </div>

        {/* Tab Navigation Controls (Full tabs for staff/admin, Conversations tab for teachers) */}
        {!isTeacher ? (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              id="tab-conversations-btn"
              onClick={() => setActiveTab('conversations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'conversations'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Discussions</span>
              {contacts.unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              id="tab-sms-direct-btn"
              onClick={() => setActiveTab('sms_direct')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sms_direct'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Diffuser SMS</span>
            </button>

            <button
              id="tab-sms-logs-btn"
              onClick={() => setActiveTab('sms_logs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sms_logs'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique SMS</span>
            </button>

            {isUserAdmin && (
              <button
                id="tab-sms-settings-btn"
                onClick={() => setActiveTab('sms_settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'sms_settings'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Passerelle SMS</span>
              </button>
            )}

            <button
              id="tab-gmail-btn"
              onClick={() => setActiveTab('gmail')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'gmail'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-rose-500" />
              <span>Google Gmail</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3.5 py-2 rounded-xl border border-emerald-200">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Accès réservé : Administration & Enseignants</span>
          </div>
        )}
      </div>

      {/* VIEW 1: INTERNAL CONVERSATIONS & CHAT */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden min-h-[620px]">
          {/* Left Sidebar: Contacts & Channels */}
          <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
            {/* Search and Filters */}
            <div className="p-4 border-b border-slate-200 bg-white space-y-3">
              <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <Filter size={14} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Année :</span>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="text-[11px] font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
                >
                  <option value="all">Toutes les années</option>
                  {years.map((y: any) => (
                    <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un collègue ou groupe..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
                />
              </div>

              {/* Group quick filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-medium text-slate-600">
                <button
                  onClick={() => setContactFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    contactFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setContactFilter('teachers')}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    contactFilter === 'teachers' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Enseignants
                </button>
                <button
                  onClick={() => setContactFilter('admin')}
                  className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    contactFilter === 'admin' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Administration
                </button>
                {!isTeacher && (
                  <button
                    onClick={() => setContactFilter('classes')}
                    className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      contactFilter === 'classes' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    Parents / Classes
                  </button>
                )}
              </div>
            </div>

            {/* List of Channels & Contacts */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
              {/* Broadcast Channels */}
              <div className="p-2 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Canaux Institutionnels
                </div>

                {/* All Teachers Broadcast */}
                <button
                  onClick={() => setSelectedTarget({ type: 'all_teachers', name: 'Tous les Enseignants (Général)' })}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                    selectedTarget?.type === 'all_teachers'
                      ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                      : 'hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">Canal Tous Enseignants</div>
                    <div className="text-[10px] text-slate-500 truncate">Diffusion générale au corps professoral</div>
                  </div>
                </button>

                {/* Administration Channel */}
                <button
                  onClick={() => setSelectedTarget({ type: 'role_direction', name: 'Direction & Administration' })}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                    selectedTarget?.type === 'role_direction'
                      ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                      : 'hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">Direction & Censeurs</div>
                    <div className="text-[10px] text-slate-500 truncate">Équipe administrative & pédagogique</div>
                  </div>
                </button>

                {/* All Parents Channel */}
                {isUserAdmin && (
                  <button
                    onClick={() => setSelectedTarget({ type: 'all_parents', name: 'Tous les Parents d\'élèves' })}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      selectedTarget?.type === 'all_parents'
                        ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                        : 'hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">Tous les Parents d'élèves</div>
                      <div className="text-[10px] text-slate-500 truncate">Diffusion aux familles de l'école</div>
                    </div>
                  </button>
                )}
              </div>

              {/* Class Parent Channels */}
              {contactFilter === 'classes' && (
                <div className="p-2 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Parents par Classe
                  </div>
                  {contacts.classes.map(c => (
                    <button
                      key={`class-${c.id}`}
                      onClick={() => setSelectedTarget({
                        type: 'class_parents',
                        classe_id: c.id,
                        name: `Parents: Classe ${c.nom}`
                      })}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        selectedTarget?.type === 'class_parents' && selectedTarget.classe_id === c.id
                          ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                          : 'hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold">
                        {c.nom.substring(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">Classe {c.nom}</div>
                        <div className="text-[10px] text-slate-500 truncate">{c.nombre_eleves || 0} élèves inscrits</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Individual Contacts */}
              {contactFilter !== 'classes' && (
                <div className="p-2 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Membres du Personnel ({filteredUsers.length})
                  </div>
                  {filteredUsers.map(u => (
                    <button
                      key={`user-${u.id}`}
                      onClick={() => setSelectedTarget({
                        type: 'user',
                        id: u.id,
                        name: u.name,
                        role: u.role,
                        telephone: u.telephone
                      })}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        selectedTarget?.type === 'user' && selectedTarget.id === u.id
                          ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                          : 'hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs uppercase overflow-hidden">
                        {u.photo ? (
                          <img src={u.photo} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          u.name.substring(0, 2)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center justify-between">
                          <span>{u.name}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-medium">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {u.telephone ? `Tél: ${u.telephone}` : u.email}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Panel: Conversation Thread & Composer */}
          <div className="lg:col-span-8 flex flex-col justify-between h-full bg-white">
            {/* Conversation Header */}
            {selectedTarget ? (
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {selectedTarget.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {selectedTarget.name}
                      {selectedTarget.role && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          {selectedTarget.role}
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      {selectedTarget.telephone && (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <Phone className="w-3 h-3" /> {selectedTarget.telephone}
                        </span>
                      )}
                      <span>Messagerie cryptée & sécurisée</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fetchThreadMessages(selectedTarget)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Actualiser la discussion"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ) : (
              <div className="p-4 border-b border-slate-200 text-xs text-slate-500">
                Sélectionnez un contact pour démarrer la discussion
              </div>
            )}

            {/* Message History Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[420px] bg-slate-50/30">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement des messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <p className="text-xs">Aucun message pour l'instant dans cette conversation.</p>
                  <p className="text-[11px] text-slate-400">Envoyez le premier message ci-dessous.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div
                      key={`msg-${msg.id}`}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-baseline gap-2 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {isMine ? 'Vous' : msg.sender_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {msg.created_at ? format(new Date(msg.created_at), 'dd MMM HH:mm', { locale: fr }) : ''}
                        </span>
                        {msg.is_sms_sent === 1 && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Smartphone className="w-2.5 h-2.5" /> SMS expédié
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMine
                            ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.subject && (
                          <div className={`font-bold mb-1 pb-1 border-b ${isMine ? 'border-emerald-500 text-emerald-100' : 'border-slate-100 text-slate-900'}`}>
                            {msg.subject}
                          </div>
                        )}
                        {msg.content && msg.content !== '[Message Vocal]' && (
                          <div className="whitespace-pre-wrap mb-1">{msg.content}</div>
                        )}
                        
                        {msg.audio_url && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <VoicePlayer audioUrl={msg.audio_url} isMine={isMine} />
                            <button
                              onClick={() => {
                                const audio = new Audio(msg.audio_url!);
                                audio.play().catch(e => console.warn("Quick play error:", e));
                              }}
                              className={`p-2 rounded-full shadow-sm transition-all active:scale-90 ${
                                isMine ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              title="Lecture rapide"
                            >
                              <Play size={12} fill="currentColor" />
                            </button>
                          </div>
                        )}
                        {msg.attachment_url && (
                          <div className={`mt-2 rounded-xl border flex flex-col transition-all overflow-hidden ${
                            isMine ? 'bg-emerald-700/30 border-emerald-500/50' : 'bg-slate-50 border-slate-200'
                          }`}>
                            {/* Media Preview */}
                            {msg.attachment_name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                              <div className="relative group cursor-pointer overflow-hidden max-h-[300px]">
                                <img 
                                  src={msg.attachment_url} 
                                  alt={msg.attachment_name}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  onClick={() => window.open(msg.attachment_url, '_blank')}
                                />
                              </div>
                            ) : msg.attachment_name?.toLowerCase().match(/\.(mp4|webm|mov|avi|wmv)$/) ? (
                              <div className="relative max-h-[300px] bg-black">
                                <video 
                                  src={msg.attachment_url} 
                                  controls 
                                  className="w-full max-h-[300px]"
                                />
                              </div>
                            ) : null}

                            {/* Info & Download Bar */}
                            <div className={`p-2.5 flex items-center gap-3 ${
                              msg.attachment_name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi|wmv)$/) ? 'border-t border-inherit' : ''
                            }`}>
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                isMine ? 'bg-emerald-500/30' : 'bg-white shadow-sm'
                              }`}>
                                {msg.attachment_name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                                  <ImageIcon size={18} className={isMine ? 'text-emerald-100' : 'text-emerald-600'} />
                                ) : msg.attachment_name?.toLowerCase().match(/\.(mp4|webm|mov|avi|wmv)$/) ? (
                                  <Film size={18} className={isMine ? 'text-emerald-100' : 'text-rose-500'} />
                                ) : msg.attachment_name?.toLowerCase().match(/\.(mp3|wav|m4a|ogg)$/) ? (
                                  <Volume2 size={18} className={isMine ? 'text-emerald-100' : 'text-blue-500'} />
                                ) : (
                                  <FileText size={18} className={isMine ? 'text-emerald-100' : 'text-slate-500'} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-[11px] font-bold truncate leading-tight mb-0.5 ${isMine ? 'text-white' : 'text-slate-800'}`}>
                                  {msg.attachment_name || 'Fichier joint'}
                                </div>
                                <a 
                                  href={msg.attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`text-[10px] flex items-center gap-1 font-semibold underline decoration-2 underline-offset-2 ${
                                    isMine ? 'text-emerald-100 hover:text-white' : 'text-emerald-600 hover:text-emerald-700'
                                  }`}
                                >
                                  <Download size={10} /> Ouvrir / Télécharger
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 mt-1 px-1">
                        {msg.audio_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shadow-2xs">
                            <Volume2 className="w-3 h-3 text-emerald-600" />
                            Message vocal
                          </span>
                        )}
                        {msg.attachment_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            Document joint
                          </span>
                        )}

                        <button
                          onClick={() => speakMessage(msg)}
                          className={`p-1 rounded-md transition-colors ${
                            speakingMsgId === msg.id 
                              ? 'text-rose-500 bg-rose-50' 
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={speakingMsgId === msg.id ? "Arrêter la synthèse vocale" : "Synthèse vocale (lecture du texte)"}
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${speakingMsgId === msg.id ? 'animate-pulse' : ''}`} />
                        </button>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          {isMine && (
                            <CheckCheck className={`w-3.5 h-3.5 ${msg.is_read ? 'text-emerald-500' : 'text-slate-300'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white space-y-3">
              {/* Optional Subject */}
              <input
                type="text"
                placeholder="Objet du message (facultatif)..."
                value={messageSubject}
                onChange={e => setMessageSubject(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              {/* Main message text */}
              {isRecording ? (
                <div className="flex items-center justify-between p-4 bg-rose-50/80 rounded-2xl border border-rose-200 animate-pulse shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping absolute"></span>
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-600 relative"></span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-rose-800 block">Enregistrement vocal en direct...</span>
                      <span className="text-[11px] font-mono font-bold text-rose-600">{formatTime(recordingTime)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                      title="Annuler l'enregistrement"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-1.5 bg-rose-600 text-white rounded-lg shadow hover:bg-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                      title="Arrêter et envoyer le message vocal"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Envoyer le vocal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={`Écrire votre message pour ${selectedTarget?.name || 'le destinataire'}...`}
                    value={messageContent}
                    onChange={e => setMessageContent(e.target.value)}
                    className={`w-full p-3 text-xs rounded-xl border focus:outline-none transition-all resize-none ${
                      listeningTarget === 'internal' 
                        ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-50/30' 
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                    required={!isRecording}
                  />
                  
                  {listeningTarget === 'internal' && (
                    <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold animate-pulse flex items-center gap-1.5 shadow-sm border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      Dictée en cours...
                      <button
                        type="button"
                        onClick={() => toggleDictation('internal')}
                        className="ml-1 text-rose-700 hover:text-rose-900 font-bold"
                        title="Arrêter la dictée"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Footer controls: Separated action bar & Send button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
                {/* Left side: Media tools and SMS checkbox */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900 mr-2 py-1">
                    <input
                      type="checkbox"
                      checked={sendWithSms}
                      onChange={e => setSendWithSms(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="flex items-center gap-1.5 font-bold">
                      <Smartphone className="w-4 h-4 text-amber-500" />
                      <span className="inline">Copie</span> SMS
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-900 mr-2 py-1" title="Envoyer également par email réel via megafixaservices01@gmail.com">
                    <input
                      type="checkbox"
                      checked={sendWithEmail}
                      onChange={e => setSendWithEmail(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="flex items-center gap-1.5 font-bold text-blue-700">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="inline">Envoi</span> Email réel
                    </span>
                  </label>

                  <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                  {/* Attachment Tool 1: File selection button (Paperclip) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile || isRecording}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                      uploadingFile 
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 animate-pulse' 
                        : 'border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 bg-white'
                    }`}
                    title="Joindre tout type de fichier (PDF, Word, Image, Vidéo, etc.)"
                  >
                    <Paperclip size={15} className={uploadingFile ? 'animate-spin' : 'text-slate-500'} />
                    <span>{uploadingFile ? 'Envoi...' : 'Fichier'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {/* Audio Tool 2: Direct voice record button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={uploadingFile || isRecording}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 bg-white text-xs font-bold transition-all shadow-sm"
                    title="Enregistrer un message vocal direct au micro"
                  >
                    <Volume2 size={15} className="text-rose-500" />
                    <span>Micro</span>
                  </button>

                  {/* Audio Tool 3: Dictation button */}
                  <button
                    type="button"
                    onClick={() => toggleDictation('internal')}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                      listeningTarget === 'internal' 
                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm animate-pulse' 
                        : 'border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 bg-white'
                    }`}
                    title={listeningTarget === 'internal' ? "Arrêter la dictée" : "Activer la dictée vocale"}
                  >
                    {listeningTarget === 'internal' ? <MicOff size={15} /> : <Mic size={15} className="text-slate-400" />}
                    <span>Dictée</span>
                  </button>
                </div>

                {/* Right side: Send button cleanly separated */}
                <div className="flex items-center w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    type="submit"
                    disabled={sendingMessage || (!messageContent.trim() && !isRecording)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    {sendingMessage ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: DIRECT SMS BROADCASTER */}
      {activeTab === 'sms_direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Diffuser une Campagne SMS Directe
              </h2>
              <p className="text-xs text-slate-500">
                Envoyez des SMS officiels instantanés aux parents d'élèves, au corps professoral ou à un numéro précis.
              </p>
            </div>

            <form onSubmit={handleSendDirectSms} className="space-y-5">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Groupe de destinataires cibles
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'parents', label: 'Tous les Parents', icon: Users },
                    { id: 'teachers', label: 'Enseignants', icon: GraduationCap },
                    { id: 'class', label: 'Parents par Classe', icon: Filter },
                    { id: 'custom', label: 'Numéro Unique', icon: Phone }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isSelected = smsDirectCategory === tab.id;
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => setSmsDirectCategory(tab.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class selector if category = class */}
              {smsDirectCategory === 'class' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sélectionner la classe
                  </label>
                  <select
                    value={smsDirectClassId}
                    onChange={e => setSmsDirectClassId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    <option value="">-- Choisissez une classe --</option>
                    {contacts.classes.map(c => (
                      <option key={c.id} value={c.id}>
                        Classe {c.nom} ({c.nombre_eleves || 0} élèves)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Single custom phone inputs */}
              {smsDirectCategory === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nom du destinataire
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: M. Mensah (Parent d'élève)"
                      value={smsDirectCustomName}
                      onChange={e => setSmsDirectCustomName(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Numéro de téléphone (+ indicatif)
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: +229 97 00 00 00"
                      value={smsDirectCustomPhone}
                      onChange={e => setSmsDirectCustomPhone(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                </div>
              )}

              {/* SMS Message textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Contenu du message SMS
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {smsDirectContent.length} caractères • {Math.max(1, Math.ceil(smsDirectContent.length / 160))} SMS
                  </span>
                </div>
                <div className="relative group">
                  <textarea
                    rows={4}
                    placeholder="Saisissez ici le texte de votre SMS officiel..."
                    value={smsDirectContent}
                    onChange={e => setSmsDirectContent(e.target.value)}
                    className={`w-full p-3 pr-12 text-xs rounded-xl border focus:outline-none transition-all resize-none font-sans ${
                      listeningTarget === 'sms' 
                        ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-50/30' 
                        : 'border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                    required
                  />
                  
                  {/* Dictation Button */}
                  <button
                    type="button"
                    onClick={() => toggleDictation('sms')}
                    className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${
                      listeningTarget === 'sms' 
                        ? 'bg-rose-500 text-white animate-pulse shadow-lg' 
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={listeningTarget === 'sms' ? "Arrêter la dictée" : "Activer la dictée vocale"}
                  >
                    {listeningTarget === 'sms' ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  {listeningTarget === 'sms' && (
                    <div className="absolute bottom-3 right-14 text-[10px] font-bold text-rose-600 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      Dictée en cours...
                    </div>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={sendingDirectSms || !smsDirectContent.trim()}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sendingDirectSms ? 'Diffusion en cours...' : 'Envoyer la diffusion SMS'}
              </button>
            </form>
          </div>

          {/* Right Column: Templates and Balance */}
          <div className="lg:col-span-4 space-y-4">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-100">Solde SMS de l'Établissement</span>
                <Sparkles className="w-4 h-4 text-emerald-200" />
              </div>
              <div className="text-2xl font-black tracking-tight">
                {smsConfig?.credit_balance ?? 1000} <span className="text-xs font-normal">SMS disponibles</span>
              </div>
              <div className="text-[11px] text-emerald-100">
                Passerelle active: <strong className="uppercase">{smsConfig?.provider || 'Simulation'}</strong>
              </div>
            </div>

            {/* Quick Templates Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Modèles de SMS Fréquents
              </h3>
              <div className="space-y-2">
                {smsTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSmsDirectContent(tpl.text)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
                  >
                    <div className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                      {tpl.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {tpl.text}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SMS LOGS & STATS */}
      {activeTab === 'sms_logs' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          {smsStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Total SMS Envoyés</div>
                <div className="text-xl font-bold text-slate-800 mt-1">{smsStats.total_sms || 0}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs text-emerald-600 font-medium">Délivrés avec succès</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">{smsStats.total_success || 0}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs text-rose-500 font-medium">Échecs d'envoi</div>
                <div className="text-xl font-bold text-rose-600 mt-1">{smsStats.total_failed || 0}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Coût Estimatif</div>
                <div className="text-xl font-bold text-slate-800 mt-1">{smsStats.total_cost || 0} FCFA</div>
              </div>
            </div>
          )}

          {/* Logs Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Journal de traçabilité des SMS ({smsLogs.length})
                </h3>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Filter size={12} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Année :</span>
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className="text-[11px] font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
                  >
                    <option value="all">Toutes les années</option>
                    {years.map((y: any) => (
                      <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={fetchSmsLogs}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSmsLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3.5">Date & Heure</th>
                    <th className="p-3.5">Destinataire</th>
                    <th className="p-3.5">Téléphone</th>
                    <th className="p-3.5">Message</th>
                    <th className="p-3.5">Passerelle</th>
                    <th className="p-3.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {smsLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Aucun SMS envoyé pour le moment.
                      </td>
                    </tr>
                  ) : (
                    smsLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {log.recipient_name}
                          <span className="block text-[10px] text-slate-400 capitalize">{log.recipient_type}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                          {log.recipient_phone}
                        </td>
                        <td className="p-3.5 text-slate-700 max-w-xs truncate">
                          {log.message}
                        </td>
                        <td className="p-3.5 uppercase text-[10px] font-semibold text-slate-500">
                          {log.provider}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              log.status === 'delivered' || log.status === 'sent' || log.status === 'simulated'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status === 'simulated' ? 'Envoyé (Passerelle)' : log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: SMS GATEWAY CONFIGURATION */}
      {activeTab === 'sms_settings' && isUserAdmin && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              Configuration de la Passerelle SMS
            </h2>
            <p className="text-xs text-slate-500">
              Configurez le fournisseur d'envoi de SMS (Twilio, Orange SMS, MTN API ou Simulation locale intégrée).
            </p>
          </div>

          <form onSubmit={handleSaveSmsConfig} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fournisseur SMS (Passerelle)</label>
              <select
                value={smsConfig.provider}
                onChange={e => setSmsConfig({ ...smsConfig, provider: e.target.value as any })}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="simulation">Passerelle Intelligente / Simulation Directe (Inclus)</option>
                <option value="twilio">Twilio Cloud SMS API</option>
                <option value="orange_sms">Orange SMS Gateway Africa</option>
                <option value="mtn_sms">MTN MoMo SMS Gateway</option>
                <option value="custom_gateway">Passerelle Webhook Personnalisée</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom d'expéditeur (Sender ID)</label>
              <input
                type="text"
                value={smsConfig.sender_number_or_name || ''}
                onChange={e => setSmsConfig({ ...smsConfig, sender_number_or_name: e.target.value })}
                placeholder="Ex: MEGAFIXA ou ECOLE-PRO"
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {smsConfig.provider === 'twilio' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Twilio Account SID</label>
                  <input
                    type="text"
                    value={smsConfig.account_sid || ''}
                    onChange={e => setSmsConfig({ ...smsConfig, account_sid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Twilio Auth Token</label>
                  <input
                    type="password"
                    value={smsConfig.auth_token || ''}
                    onChange={e => setSmsConfig({ ...smsConfig, auth_token: e.target.value })}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Solde de Crédit SMS (Unités)</label>
              <input
                type="number"
                value={smsConfig.credit_balance ?? 1000}
                onChange={e => setSmsConfig({ ...smsConfig, credit_balance: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSmsConfig}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-sm"
              >
                {savingSmsConfig ? 'Enregistrement...' : 'Enregistrer la configuration SMS'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gmail Inbox & Compose View */}
      {activeTab === 'gmail' && (
        <div className="pt-2">
          <GmailInboxView />
        </div>
      )}
    </div>
  );
}
