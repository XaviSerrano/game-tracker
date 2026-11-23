import { useLanguage } from '../i18n.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';

type LegalPageKind = 'privacy' | 'terms' | 'cookies';

const copy: Record<LegalPageKind, { title: string; intro: string; sections: [string, string][] }> = {
  privacy: {
    title: 'Política de privacidad',
    intro: 'Te explicamos qué datos utiliza GameTracker, para qué y cómo puedes ejercer tus derechos.',
    sections: [
      ['Responsable y contacto', 'El responsable del tratamiento es [nombre y apellidos o razón social], con domicilio en [domicilio] y contacto en [correo electrónico]. Completa estos datos antes de publicar. También puedes contactar mediante el repositorio público de GameTracker: github.com/XaviSerrano/game-tracker/issues. No publiques datos sensibles en una incidencia.'],
      ['Datos tratados', 'Tratamos los datos de cuenta (nombre de usuario, correo y credencial protegida), perfil (biografía y avatar) y uso de las funciones (juegos, estados, puntuaciones, horas, notas, listas, reseñas, favoritos y actividad social). Los perfiles y el contenido compartido pueden ser visibles para otros usuarios según las funciones de la app. También se generan datos técnicos y de seguridad, como información de sesión y solicitudes de autenticación.'],
      ['Finalidad y base jurídica', 'Usamos los datos para crear y proteger la cuenta, prestar las funciones solicitadas, mostrar el contenido que compartes, atender la recuperación de acceso y mantener el servicio. La base jurídica es la ejecución del servicio, el interés legítimo en protegerlo y, cuando corresponda, el cumplimiento de obligaciones legales.'],
      ['Proveedores', 'El servicio utiliza alojamiento y base de datos para operar; IGDB/Twitch para el catálogo de juegos; Google Translate para traducir descripciones cuando se solicita; un proveedor de correo para recuperación de contraseña; y Vercel Analytics en la web. Estos proveedores pueden recibir datos técnicos de conexión y tratar información conforme a sus propias condiciones.'],
      ['Conservación y derechos', 'Conservamos los datos mientras mantengas la cuenta, salvo los plazos necesarios para atender obligaciones o incidencias. Puedes eliminar la cuenta desde el perfil y solicitar acceso, rectificación, supresión, limitación u oposición mediante las opciones de la app o el contacto indicado. Las copias de seguridad pueden tardar en expirar según el ciclo técnico del proveedor.'],
      ['Menores y cambios', 'GameTracker no está dirigida específicamente a menores de 13 años. Si crees que un menor de esa edad ha proporcionado datos, contacta con el responsable. Publicaremos aquí las actualizaciones de esta política. Última actualización: 23 de noviembre de 2026.']
    ]
  },
  terms: {
    title: 'Condiciones de uso',
    intro: 'Estas condiciones regulan el uso de la cuenta, las funciones y el contenido de GameTracker.',
    sections: [
      ['Cuenta', 'Debes facilitar información veraz, mantener la seguridad de tus credenciales y usar una sola cuenta personal. Eres responsable de la actividad realizada desde tu cuenta. Puedes eliminarla desde tu perfil.'],
      ['Contenido de usuario', 'Conservas los derechos que tengas sobre el contenido que publicas. Al compartirlo en las funciones sociales, permites que GameTracker lo almacene y lo muestre para prestar esas funciones. Solo publica material que tengas derecho a compartir y evita incluir información personal sensible.'],
      ['Uso aceptable', 'No uses el servicio para vulnerar derechos, acosar, distribuir contenido ilícito, enviar spam, interferir con la seguridad o intentar extraer datos mediante medios no autorizados. Podemos limitar contenido o cuentas cuando sea necesario para proteger a usuarios y el servicio, respetando la normativa aplicable.'],
      ['Disponibilidad y cambios', 'GameTracker se ofrece tal como está disponible y algunas funciones pueden cambiar o interrumpirse por mantenimiento o motivos operativos. El catálogo de juegos procede de fuentes externas y puede contener errores u omisiones. Nada de esta sección limita derechos que no puedan excluirse legalmente.'],
      ['Contacto y vigencia', 'Para consultas sobre estas condiciones, utiliza [correo electrónico de contacto] o el repositorio público de GameTracker. Última actualización: 23 de noviembre de 2026.']
    ]
  },
  cookies: {
    title: 'Política de cookies',
    intro: 'Información sobre el almacenamiento local y las cookies utilizadas por GameTracker.',
    sections: [
      ['Cookies necesarias', 'La versión web utiliza una cookie de sesión protegida para mantener tu inicio de sesión. Es necesaria para prestar la cuenta y no se usa para publicidad.'],
      ['Preferencias', 'La app guarda en el almacenamiento local del navegador el idioma que eliges. Esta preferencia permite recordar cómo quieres ver la interfaz.'],
      ['Analítica', 'La web carga Vercel Analytics para obtener métricas de uso. La app Android nativa no carga este servicio. Consulta la información del proveedor para conocer sus tecnologías y plazos.'],
      ['Control', 'Puedes eliminar cookies y datos locales desde los ajustes del navegador. Si bloqueas la cookie de sesión, algunas funciones —como iniciar sesión— dejarán de funcionar. No se utilizan cookies publicitarias personalizadas según la configuración actual del servicio.']
    ]
  }
};

const english: Record<LegalPageKind, typeof copy[LegalPageKind]> = {
  privacy: { title: 'Privacy policy', intro: 'What data GameTracker uses, why it uses it, and how you can exercise your rights.', sections: [
    ['Controller and contact', 'The data controller is [full name or company name], located at [address], contactable at [email]. Complete these details before publishing. You can also contact us through the public GameTracker repository: github.com/XaviSerrano/game-tracker/issues. Do not post sensitive data in an issue.'],
    ['Data we process', 'We process account data (username, email, and protected credentials), profile data (bio and avatar), and data used by app features (games, statuses, ratings, hours, notes, lists, reviews, favorites, and social activity). Profiles and shared content may be visible to other users. Technical and security data, such as session and authentication request information, is also generated.'],
    ['Purpose and legal basis', 'We use data to create and secure accounts, provide requested features, display content you share, support account recovery, and maintain the service. The legal bases are performance of the service, our legitimate interest in protecting it, and, where applicable, compliance with legal obligations.'],
    ['Providers', 'The service uses hosting and a database; IGDB/Twitch for game catalog data; Google Translate to translate descriptions on request; an email provider for password recovery; and Vercel Analytics on the web. These providers may receive technical connection data and process information under their own terms.'],
    ['Retention and rights', 'We keep account data while your account remains active, subject to periods needed for legal obligations or disputes. You can delete your account from your profile and request access, correction, deletion, restriction, or objection through the app or the contact above. Backups may take time to expire under provider retention cycles.'],
    ['Children and changes', 'GameTracker is not specifically directed to children under 13. If you believe a child under that age has provided data, contact the controller. Updates to this policy will be posted here. Last updated: November 23, 2026.']
  ] },
  terms: { title: 'Terms of use', intro: 'These terms govern the use of GameTracker accounts, features, and content.', sections: [
    ['Account', 'You must provide accurate information, keep your credentials secure, and use one personal account. You are responsible for activity on your account. You can delete it from your profile.'],
    ['User content', 'You retain any rights you hold in content you post. By sharing it through social features, you allow GameTracker to store and display it to provide those features. Only post material you have the right to share, and avoid sensitive personal information.'],
    ['Acceptable use', 'Do not use the service to violate rights, harass others, distribute unlawful content, send spam, interfere with security, or extract data by unauthorized means. We may restrict content or accounts when necessary to protect users and the service, subject to applicable law.'],
    ['Availability and changes', 'GameTracker is provided as available, and features may change or be interrupted for maintenance or operational reasons. The game catalog comes from external sources and may contain errors or omissions. Nothing in this section limits rights that cannot legally be excluded.'],
    ['Contact and effective date', 'For questions about these terms, use [contact email] or the public GameTracker repository. Last updated: November 23, 2026.']
  ] },
  cookies: { title: 'Cookie policy', intro: 'Information about local storage and cookies used by GameTracker.', sections: [
    ['Necessary cookies', 'The web app uses a protected session cookie to keep you signed in. It is necessary to provide account features and is not used for advertising.'],
    ['Preferences', 'The app stores your chosen language in the browser local storage so it can remember your interface preference.'],
    ['Analytics', 'The website loads Vercel Analytics to measure site usage. The native Android app does not load this service. Check the provider’s information for its technologies and retention periods.'],
    ['Controls', 'You can delete cookies and local data in your browser settings. Blocking the session cookie will disable some features, including sign-in. The current service configuration does not use personalized advertising cookies.']
  ] }
};

export function LegalPage({ kind, onHome }: { kind: LegalPageKind; onHome: () => void }) {
  const { language } = useLanguage();
  const page = (language === 'es' ? copy : english)[kind];
  return <div className="min-h-screen text-slate-200 font-sans">
    <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-8">
      <a href="/" onClick={event => { event.preventDefault(); onHome(); }} aria-label={language === 'es' ? 'Volver al inicio' : 'Back home'}>
        <img src="/logo/svg/gametracker-monogram-white.svg" alt="GameTracker" className="h-6 w-auto" />
      </a>
      <LanguageSelector compact />
    </header>
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{page.title}</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-400">{page.intro}</p>
      <div className="mt-10 space-y-8">
        {page.sections.map(([heading, body]) => <section key={heading}>
          <h2 className="text-lg font-semibold text-white">{heading}</h2>
          <p className="mt-2 leading-7 text-slate-300">{body}</p>
        </section>)}
      </div>
    </main>
  </div>;
}

export type { LegalPageKind };
