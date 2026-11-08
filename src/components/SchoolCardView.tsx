import React from 'react';
import logoFallback from '../LOGO_MEGFIXAEDEUC_PRO.png';
import { abbreviateSubjectName } from '../utils/subjectUtils';
import { QRCodeSVG } from 'qrcode.react';
import { buildVerificationUrl } from '../utils/qrAuth';

export interface CardData {
  id?: number | string;
  type: 'student' | 'teacher' | 'staff';
  nom: string;
  prenom: string;
  matricule?: string;
  sexe?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  cycle?: string;
  classe_nom?: string;
  classe_titulaire?: string;
  poste?: string;
  matiere_nom?: string;
  matiere_principale?: string;
  telephone?: string;
  tel_parent?: string;
  photo?: string;
}

export interface CardSettingsData {
  nom_pays?: string;
  ministere_tutelle?: string;
  drapeau_pays?: string;
  signature_directeur?: string;
  theme_style?: string;
  titre_signataire?: string;
  nom_directeur_custom?: string;
  lieu_emission?: string;
  show_lieu_naissance?: boolean | number;
  show_qr_code?: boolean | number;
  detected_director_title?: string;
  detected_director_name?: string;
}

export interface SchoolInfoData {
  nom?: string;
  slogan?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  logo?: string;
  annee_active?: string;
}

interface Props {
  key?: React.Key;
  data: CardData;
  schoolInfo: SchoolInfoData;
  settings: CardSettingsData;
  elementId?: string;
  scale?: number;
}

export default function SchoolCardView({ data, schoolInfo, settings, elementId, scale = 1 }: Props) {
  const theme = settings.theme_style || 'classic_emerald';

  // Determine director signataire title
  let directorTitle = "Le Directeur";
  if (settings.titre_signataire && settings.titre_signataire !== 'auto') {
    directorTitle = settings.titre_signataire;
  } else if (settings.detected_director_title) {
    directorTitle = settings.detected_director_title;
  }

  // Determine director / signatory name
  let signatoryName = "";
  if (settings.nom_directeur_custom && settings.nom_directeur_custom.trim() !== '') {
    signatoryName = settings.nom_directeur_custom.trim();
  } else if (settings.detected_director_name && settings.detected_director_name.trim() !== '') {
    signatoryName = settings.detected_director_name.trim();
  } else {
    signatoryName = "Francis AYEDEGUE";
  }

  // Determine card header title
  let cardHeaderTitle = "CARTE SCOLAIRE";
  if (data.type === 'teacher') cardHeaderTitle = "BADGE ENSEIGNANT";
  if (data.type === 'staff') cardHeaderTitle = "BADGE PERSONNEL";

  // Build Verification URL for QR code
  const cardVerificationUrl = buildVerificationUrl({
    docType: data.type === 'teacher' ? 'badge_enseignant' : data.type === 'staff' ? 'badge_personnel' : 'carte_scolaire',
    docTitle: data.type === 'teacher' ? 'Badge Officiel Enseignant' : data.type === 'staff' ? 'Badge Personnel' : 'Carte Scolaire Officielle',
    reference: data.matricule || `ID-${data.id || '000'}`,
    schoolName: schoolInfo.nom || 'Établissement Scolaire',
    beneficiaryNom: data.nom,
    beneficiaryPrenom: data.prenom,
    matricule: data.matricule,
    classe: data.classe_nom || data.classe_titulaire,
    anneeScolaire: schoolInfo.annee_active || '2025-2026',
    signataire: signatoryName
  });

  // Theme styling configurations using pure standard RGB colors (High-contrast solid colors for canvas/CMYK/RGB export)
  const themeStyles = {
    classic_emerald: {
      headerBackground: 'linear-gradient(to right, rgb(6, 78, 59), rgb(4, 120, 87), rgb(6, 95, 70))',
      headerTextColor: 'rgb(255, 255, 255)',
      headerSubTextColor: 'rgb(236, 253, 245)',
      dividerColor: 'rgb(245, 158, 11)',
      titleBgColor: 'rgb(209, 250, 229)',
      titleTextColor: 'rgb(6, 78, 59)',
      titleBorderColor: 'rgb(5, 150, 105)',
      cardBorderColor: 'rgb(6, 95, 70)',
      accentColor: 'rgb(6, 78, 59)',
      badgeBgColor: 'rgb(209, 250, 229)',
      badgeTextColor: 'rgb(6, 78, 59)',
      badgeBorderColor: 'rgb(110, 231, 183)'
    },
    royal_blue: {
      headerBackground: 'linear-gradient(to right, rgb(30, 58, 138), rgb(55, 48, 163), rgb(23, 37, 84))',
      headerTextColor: 'rgb(255, 255, 255)',
      headerSubTextColor: 'rgb(239, 246, 255)',
      dividerColor: 'rgb(245, 158, 11)',
      titleBgColor: 'rgb(219, 234, 254)',
      titleTextColor: 'rgb(30, 58, 138)',
      titleBorderColor: 'rgb(37, 99, 235)',
      cardBorderColor: 'rgb(30, 58, 138)',
      accentColor: 'rgb(30, 58, 138)',
      badgeBgColor: 'rgb(219, 234, 254)',
      badgeTextColor: 'rgb(30, 58, 138)',
      badgeBorderColor: 'rgb(147, 197, 253)'
    },
    crimson_gold: {
      headerBackground: 'linear-gradient(to right, rgb(76, 5, 25), rgb(136, 19, 55), rgb(69, 10, 10))',
      headerTextColor: 'rgb(255, 255, 255)',
      headerSubTextColor: 'rgb(255, 241, 242)',
      dividerColor: 'rgb(245, 158, 11)',
      titleBgColor: 'rgb(255, 228, 230)',
      titleTextColor: 'rgb(76, 5, 25)',
      titleBorderColor: 'rgb(159, 18, 57)',
      cardBorderColor: 'rgb(136, 19, 55)',
      accentColor: 'rgb(136, 19, 55)',
      badgeBgColor: 'rgb(255, 228, 230)',
      badgeTextColor: 'rgb(76, 5, 25)',
      badgeBorderColor: 'rgb(253, 164, 175)'
    },
    modern_slate: {
      headerBackground: 'linear-gradient(to right, rgb(15, 23, 42), rgb(30, 41, 59), rgb(24, 24, 27))',
      headerTextColor: 'rgb(255, 255, 255)',
      headerSubTextColor: 'rgb(241, 245, 249)',
      dividerColor: 'rgb(16, 185, 129)',
      titleBgColor: 'rgb(226, 232, 240)',
      titleTextColor: 'rgb(15, 23, 42)',
      titleBorderColor: 'rgb(51, 65, 85)',
      cardBorderColor: 'rgb(30, 41, 59)',
      accentColor: 'rgb(15, 23, 42)',
      badgeBgColor: 'rgb(226, 232, 240)',
      badgeTextColor: 'rgb(15, 23, 42)',
      badgeBorderColor: 'rgb(148, 163, 184)'
    },
    tricolor_light: {
      headerBackground: 'rgb(241, 245, 249)',
      headerTextColor: 'rgb(15, 23, 42)',
      headerSubTextColor: 'rgb(71, 85, 105)',
      dividerColor: 'rgb(5, 150, 105)',
      titleBgColor: 'rgb(241, 245, 249)',
      titleTextColor: 'rgb(15, 23, 42)',
      titleBorderColor: 'rgb(148, 163, 184)',
      cardBorderColor: 'rgb(148, 163, 184)',
      accentColor: 'rgb(15, 23, 42)',
      badgeBgColor: 'rgb(241, 245, 249)',
      badgeTextColor: 'rgb(15, 23, 42)',
      badgeBorderColor: 'rgb(203, 213, 225)'
    }
  };

  const currentTheme = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic_emerald;

  // Formatting date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const schoolLogo = schoolInfo.logo || logoFallback;
  const showLieu = settings.show_lieu_naissance ?? true;

  return (
    <div 
      id={elementId}
      style={{ 
        transform: scale !== 1 ? `scale(${scale})` : undefined, 
        transformOrigin: 'top left',
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(30, 41, 59)',
        border: `1px solid ${currentTheme.cardBorderColor}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
      }}
      className="w-[360px] h-[230px] rounded-xl overflow-hidden flex flex-col justify-between relative select-none font-sans print:shadow-none print:border"
    >
      {/* Top Header Bar */}
      <div 
        style={{ 
          background: currentTheme.headerBackground,
          color: currentTheme.headerTextColor
        }}
        className="px-2 py-1 flex items-center justify-between gap-1 relative z-10 min-h-[46px]"
      >
        {/* QR Code Authentification on LEFT (Balances School Logo on RIGHT) */}
        <div 
          style={{ 
            backgroundColor: 'rgb(255, 255, 255)', 
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
          className="w-7 h-7 rounded-md p-0.5 flex items-center justify-center shrink-0 overflow-hidden bg-white"
          title="Authentification numérique - Scannez pour vérifier l'authenticité"
        >
          <QRCodeSVG 
            value={cardVerificationUrl} 
            size={24}
            level="L"
          />
        </div>

        {/* Centered Header Text Block */}
        <div className="flex-1 min-w-0 text-center px-1">
          {settings.nom_pays && (
            <p 
              style={{ color: currentTheme.headerSubTextColor }}
              className="font-bold uppercase tracking-wider text-[6px] leading-tight break-words"
            >
              {settings.nom_pays}
            </p>
          )}

          {settings.ministere_tutelle && (
            <p 
              style={{ color: currentTheme.headerSubTextColor, opacity: 0.9 }}
              className="font-semibold uppercase tracking-tight text-[5px] leading-tight break-words"
            >
              {settings.ministere_tutelle}
            </p>
          )}

          <h1 
            style={{ color: currentTheme.headerTextColor }}
            className={`font-black uppercase tracking-tight text-[9px] leading-tight break-words ${settings.nom_pays || settings.ministere_tutelle ? 'mt-0.5' : ''}`}
          >
            {schoolInfo.nom || 'NOM DE L\'ÉCOLE'}
          </h1>

          <p 
            style={{ color: currentTheme.headerSubTextColor }}
            className="text-[6px] leading-tight break-words font-medium"
          >
            {schoolInfo.adresse || 'Adresse de l\'établissement'}
            {schoolInfo.telephone ? ` • Tél: ${schoolInfo.telephone}` : ''}
          </p>
        </div>

        {/* School Logo on RIGHT */}
        <div 
          style={{ 
            backgroundColor: 'rgb(255, 255, 255)', 
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
          className="w-7 h-7 rounded-md p-0.5 flex items-center justify-center shrink-0"
        >
          <img 
            src={schoolLogo} 
            alt="Logo" 
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Sub-header: Country flag LEFT, Title CENTER */}
      <div 
        style={{ 
          backgroundColor: 'rgb(248, 250, 252)', 
          borderTop: '1px solid rgb(226, 232, 240)', 
          borderBottom: '1px solid rgb(226, 232, 240)' 
        }}
        className="px-2.5 py-0.5 flex items-center justify-center relative z-10 min-h-[20px]"
      >
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {settings.drapeau_pays ? (
            <img 
              src={settings.drapeau_pays} 
              alt="Drapeau" 
              style={{ border: '1px solid rgb(203, 213, 225)' }}
              className="w-4.5 h-3 object-cover rounded-2xs"
            />
          ) : (
            <div 
              style={{ 
                backgroundColor: 'rgb(226, 232, 240)', 
                border: '1px solid rgb(203, 213, 225)', 
                color: 'rgb(100, 116, 139)' 
              }}
              className="w-4.5 h-3 rounded-2xs flex items-center justify-center text-[6px] font-bold"
            >
              🏳️
            </div>
          )}
        </div>

        {/* Perfectly Centered Title Badge */}
        <div className="flex items-center justify-center">
          <span 
            style={{ 
              backgroundColor: currentTheme.titleBgColor, 
              color: currentTheme.titleTextColor, 
              border: `1px solid ${currentTheme.titleBorderColor}` 
            }}
            className="text-[8.5px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-sm inline-flex items-center justify-center leading-none text-center"
          >
            {cardHeaderTitle}
          </span>
        </div>
      </div>

      {/* Decorative Separation Line */}
      <div 
        style={{ backgroundColor: currentTheme.dividerColor }}
        className="h-[2px] w-full"
      ></div>

      {/* Card Content Body */}
      <div 
        style={{ backgroundColor: 'rgb(255, 255, 255)' }}
        className="px-2.5 py-1 flex-1 flex items-start gap-2 relative z-10"
      >
        {/* Photo on LEFT */}
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <div 
            style={{ 
              backgroundColor: 'rgb(241, 245, 249)', 
              border: '2px solid rgb(203, 213, 225)' 
            }}
            className="w-[62px] h-[74px] rounded-md overflow-hidden flex items-center justify-center relative"
          >
            {data.photo ? (
              <img 
                src={data.photo} 
                alt="Photo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                style={{ color: 'rgb(148, 163, 184)' }}
                className="flex flex-col items-center justify-center"
              >
                <svg className="w-8 h-8 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Info Column RIGHT */}
        <div className="flex-1 min-w-0 space-y-0.5 text-[8px] leading-tight">
          <div 
            style={{ borderBottom: '1px solid rgb(226, 232, 240)' }}
            className="pb-0.5"
          >
            <span 
              style={{ color: 'rgb(71, 85, 105)' }}
              className="text-[6px] uppercase font-bold block leading-none"
            >
              Nom & Prénoms
            </span>
            <span 
              style={{ color: 'rgb(2, 6, 23)' }}
              className="font-extrabold text-[9px] uppercase leading-tight block truncate"
            >
              {data.nom} {data.prenom}
            </span>
          </div>

          {/* Single-Line Full Matricule Row */}
          <div 
            style={{ borderBottom: '1px solid rgb(241, 245, 249)' }}
            className="flex items-center justify-between gap-1 py-0.5"
          >
            <span 
              style={{ color: 'rgb(71, 85, 105)' }}
              className="text-[6.5px] uppercase font-bold shrink-0 leading-none"
            >
              Matricule :
            </span>
            <span 
              style={{ 
                backgroundColor: 'rgb(241, 245, 249)', 
                color: 'rgb(15, 23, 42)', 
                border: '1px solid rgb(203, 213, 225)' 
              }}
              className="font-mono font-black text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap leading-none"
            >
              {data.matricule || `ID-${data.id || '000'}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 pt-0.5">
            <div>
              <span 
                style={{ color: 'rgb(71, 85, 105)' }}
                className="text-[6px] uppercase font-bold block leading-none"
              >
                Né(e) le
              </span>
              <span 
                style={{ color: 'rgb(15, 23, 42)' }}
                className="font-bold text-[7.5px] leading-tight block"
              >
                {formatDate(data.date_naissance)}
              </span>
            </div>

            <div>
              <span 
                style={{ color: 'rgb(71, 85, 105)' }}
                className="text-[6px] uppercase font-bold block leading-none"
              >
                Sexe
              </span>
              <span 
                style={{ color: 'rgb(15, 23, 42)' }}
                className="font-bold text-[7.5px] leading-tight block"
              >
                {data.sexe === 'M' || data.sexe === 'Masculin' ? 'Masculin (M)' : data.sexe === 'F' || data.sexe === 'Féminin' ? 'Féminin (F)' : (data.sexe || 'N/A')}
              </span>
            </div>

            {showLieu && (
              <div>
                <span 
                  style={{ color: 'rgb(71, 85, 105)' }}
                  className="text-[6px] uppercase font-bold block leading-none"
                >
                  Lieu de N.
                </span>
                <span 
                  style={{ color: 'rgb(15, 23, 42)' }}
                  className="font-bold text-[7px] leading-tight block truncate"
                >
                  {data.lieu_naissance || 'Non renseigné'}
                </span>
              </div>
            )}

            {data.type === 'student' && (
              <div>
                <span 
                  style={{ color: 'rgb(71, 85, 105)' }}
                  className="text-[6px] uppercase font-bold block leading-none"
                >
                  Tél. Parent
                </span>
                <span 
                  style={{ color: 'rgb(2, 6, 23)' }}
                  className="font-bold text-[7px] leading-tight block truncate"
                >
                  {data.tel_parent || 'Non renseigné'}
                </span>
              </div>
            )}

            {(data.type === 'teacher' || data.type === 'staff') && data.telephone && (
              <div>
                <span 
                  style={{ color: 'rgb(71, 85, 105)' }}
                  className="text-[6px] uppercase font-bold block leading-none"
                >
                  Téléphone
                </span>
                <span 
                  style={{ color: 'rgb(2, 6, 23)' }}
                  className="font-bold text-[7px] leading-tight block truncate"
                >
                  {data.telephone}
                </span>
              </div>
            )}

            {/* Classe on THE SAME LINE (Label + Badge côte à côte) */}
            {data.type === 'student' && (
              <div className="col-span-2 flex items-center gap-1.5 pt-0.5">
                <span 
                  style={{ color: 'rgb(71, 85, 105)' }}
                  className="text-[6.5px] uppercase font-black shrink-0 leading-none"
                >
                  Classe :
                </span>
                <span 
                  style={{ 
                    backgroundColor: currentTheme.badgeBgColor, 
                    color: currentTheme.badgeTextColor, 
                    border: `1px solid ${currentTheme.badgeBorderColor}` 
                  }}
                  className="inline-flex items-center px-1.5 py-0.5 rounded font-black text-[8px] uppercase tracking-wide leading-none text-center"
                >
                  {data.classe_nom || 'Classe N/A'}
                </span>
              </div>
            )}

            {/* Enseignant / Personnel on THE SAME LINE (Label + Badge côte à côte) */}
            {(data.type === 'teacher' || data.type === 'staff') && (() => {
              let roleLabel = 'Poste :';
              let roleValue = data.poste || 'Personnel';

              if (data.type === 'teacher') {
                const isPrimaryOrMaternelle = 
                  data.cycle?.toLowerCase() === 'primaire' || 
                  data.cycle?.toLowerCase() === 'maternelle' ||
                  (Boolean(data.classe_titulaire) && data.cycle?.toLowerCase() !== 'secondaire');

                if (isPrimaryOrMaternelle) {
                  roleLabel = 'Titulaire :';
                  roleValue = data.classe_titulaire || data.classe_nom || 'Titulaire';
                } else {
                  roleLabel = 'Matière :';
                  const rawSubject = data.matiere_principale || data.matiere_nom || 'Enseignant';
                  roleValue = abbreviateSubjectName(rawSubject);
                }
              }

              return (
                <div className="col-span-2 flex items-center gap-1.5 pt-0.5">
                  <span 
                    style={{ color: 'rgb(71, 85, 105)' }}
                    className="text-[6.5px] uppercase font-black shrink-0 leading-none"
                  >
                    {roleLabel}
                  </span>
                  <span 
                    style={{ 
                      backgroundColor: currentTheme.badgeBgColor, 
                      color: currentTheme.badgeTextColor, 
                      border: `1px solid ${currentTheme.badgeBorderColor}` 
                    }}
                    className="inline-flex items-center px-1.5 py-0.5 rounded font-black text-[8px] uppercase tracking-wide leading-none text-center truncate max-w-[170px]"
                    title={roleValue}
                  >
                    {roleValue}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Footer Bar with Raised Text & Bottom Safety Margin */}
      <div 
        style={{ 
          backgroundColor: 'rgb(248, 250, 252)', 
          borderTop: '1px solid rgb(226, 232, 240)', 
          color: 'rgb(51, 65, 85)' 
        }}
        className="px-2.5 py-1 flex items-center justify-between relative z-10 min-h-[46px]"
      >
        {/* Lieu d'émission uniquement (Fait à...) */}
        <div className="flex flex-col justify-center text-left max-w-[105px]">
          <span 
            style={{ color: 'rgb(30, 41, 59)' }}
            className="text-[8px] font-bold leading-tight block whitespace-nowrap"
          >
            {settings.lieu_emission || 'Fait à Cotonou'}
          </span>
        </div>

        {/* Année Scolaire sur une seule ligne */}
        <div className="text-center flex items-center justify-center px-1">
          <span 
            style={{ color: 'rgb(30, 41, 59)' }}
            className="text-[7.5px] font-extrabold uppercase tracking-tight whitespace-nowrap leading-none"
          >
            Année Scolaire : <span style={{ color: currentTheme.accentColor }} className="font-black text-[8px]">{schoolInfo.annee_active || '2025-2026'}</span>
          </span>
        </div>

        {/* Signature, Titre & Nom Signataire (Remonté, aéré et bien visible) */}
        <div className="flex flex-col items-center justify-center min-w-[85px] max-w-[125px]">
          <span 
            style={{ color: 'rgb(30, 41, 59)' }}
            className="text-[7.5px] font-black uppercase tracking-tight leading-none block text-center whitespace-nowrap"
          >
            {directorTitle}
          </span>
          <div className="h-3.5 w-14 flex items-center justify-center my-0.5">
            {settings.signature_directeur ? (
              <img 
                src={settings.signature_directeur} 
                alt="Signature" 
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div 
                style={{ 
                  borderBottom: '1px dashed rgb(203, 213, 225)', 
                  color: 'rgb(148, 163, 184)' 
                }}
                className="w-12 text-[5.5px] text-center italic leading-none"
              >
                (Signature)
              </div>
            )}
          </div>
          {signatoryName && (
            <span 
              style={{ color: 'rgb(15, 23, 42)' }}
              className="text-[7.5px] font-black uppercase tracking-tight leading-tight block text-center truncate max-w-[120px]"
              title={signatoryName}
            >
              {signatoryName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
