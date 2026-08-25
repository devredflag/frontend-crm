// Logos das marcas com que o CRM integra, nas cores oficiais de cada uma.
//
// Ficam num arquivo só e fora do alcance de qualquer troca de tema: cor de
// marca não é cor de paleta. Quando o visual do CRM foi remapeado, o azul do
// Outlook virou azul-claro do tema e o ícone deixou de ser reconhecível — é o
// tipo de coisa que só se percebe olhando a tela.
//
// Desenhados a partir da geometria pública de cada logo; não são os arquivos
// oficiais das empresas. Se algum dia esses .svg entrarem no projeto, é aqui
// que a troca acontece.

type Props = { size?: number };

export function GmailIcon({ size = 18 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden>
      <path d="M34.9 420.3h81.5V222.7L0 135.4v249.4c0 19.6 15.6 35.5 34.9 35.5z" fill="#4285F4"/>
      <path d="M395.6 420.3h81.5c19.3 0 34.9-15.9 34.9-35.5V135.4l-116.4 87.3v197.6z" fill="#34A853"/>
      <path d="M395.6 126.9v95.8L512 135.4V83c0-48.6-55.5-76.3-94.3-47.2l-22.1 91.1z" fill="#FBBC04"/>
      <path d="M116.4 222.7v-95.8L256 231.6l139.6-104.7v95.8L256 327.4z" fill="#EA4335"/>
      <path d="M0 83v52.4l116.4 87.3v-95.8L94.3 35.8C55.5 6.7 0 34.4 0 83z" fill="#C5221F"/>
    </svg>
  );
}

export function OutlookIcon({ size = 18 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      {/* folha da direita */}
      <path d="M30.4 7.2H16v17.6h14.4c.9 0 1.6-.7 1.6-1.6V8.8c0-.9-.7-1.6-1.6-1.6z" fill="#0078D4"/>
      <path d="M32 8.8V16H16V7.2h14.4c.9 0 1.6.7 1.6 1.6z" fill="#28A8EA"/>
      <path d="M16 16h16v3.2H16z" fill="#0364B8" opacity="0.35"/>
      {/* bloco da esquerda com o "O" */}
      <path d="M1.2 6.6 14 3.7c.9-.2 1.8.5 1.8 1.4v21.8c0 .9-.9 1.6-1.8 1.4L1.2 25.4c-.7-.2-1.2-.8-1.2-1.5V8.1c0-.7.5-1.3 1.2-1.5z" fill="#0364B8"/>
      <ellipse cx="7.9" cy="16" rx="4.3" ry="5.3" fill="#fff"/>
      <ellipse cx="7.9" cy="16" rx="1.9" ry="2.7" fill="#0364B8"/>
    </svg>
  );
}

export function WhatsAppIcon({ size = 18 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M16 0C7.2 0 0 7.2 0 16c0 2.8.7 5.5 2.1 7.9L0 32l8.3-2.2c2.3 1.2 4.9 1.9 7.7 1.9 8.8 0 16-7.2 16-16S24.8 0 16 0z" fill="#25D366"/>
      <path d="M23.4 19.1c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.9.2s-1 1.3-1.2 1.5c-.2.2-.4.3-.8.1-.4-.2-1.7-.6-3.2-2-1.2-1.1-2-2.4-2.2-2.8-.2-.4 0-.6.2-.8l.6-.7c.2-.2.2-.4.3-.6.1-.2 0-.5-.1-.7l-1.2-2.9c-.3-.7-.6-.6-.9-.7h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.2 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.2.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z" fill="#fff"/>
    </svg>
  );
}

/** Usada pela conexão do Google Agenda — é o "G", não o envelope do Gmail. */
export function GoogleIcon({ size = 18 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
