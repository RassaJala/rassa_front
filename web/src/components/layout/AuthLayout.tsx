import type { ReactNode } from 'react';
import { useTheme } from '~/providers/ThemeProvider';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
}

const skyTopLight = '#C7E0C0';
const skyBotLight = '#E8F0DC';
const skyTopDark = '#1A2D3A';
const skyBotDark = '#243845';
const hill1Light = '#3A7D5A';
const hill2Light = '#4A8E68';
const hill3Light = '#5A9E76';
const hill1Dark = '#1A3D2A';
const hill2Dark = '#264E38';
const hill3Dark = '#305E44';

export function AuthLayout({ children, title }: AuthLayoutProps) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      {/* LEFT: Scene */}
      <div
        className="relative flex min-h-[320px] flex-1 flex-col items-center justify-center overflow-hidden p-10 md:min-h-screen"
        style={{
          background: `linear-gradient(180deg, ${isDark ? skyTopDark : skyTopLight} 0%, ${isDark ? skyBotDark : skyBotLight} 100%)`,
        }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="absolute left-6 top-6 z-10 grid h-10 w-10 place-items-center rounded-full border text-lg backdrop-blur-sm transition-colors"
          style={{
            borderColor: 'rgba(255,255,255,0.4)',
            background: 'rgba(0,0,0,0.12)',
            color: '#fff',
          }}
          aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Celestial body */}
        <div
          className="absolute"
          style={{
            top: 60,
            right: 80,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle at 40% 40%, #D4E8C8, #C8D8A8)'
              : 'radial-gradient(circle at 40% 40%, #F2A900, #E68A2E)',
            boxShadow: isDark
              ? '0 0 50px rgba(200,216,168,0.2)'
              : '0 0 80px rgba(242,169,0,0.25)',
          }}
        />

        {/* Birds */}
        <span
          className="absolute"
          style={{
            top: 80,
            left: 180,
            fontSize: 20,
            opacity: 0.4,
            color: isDark ? 'rgba(180,200,190,0.35)' : 'rgba(55,65,55,0.35)',
          }}
        >
          ⌣
        </span>
        <span
          className="absolute"
          style={{
            top: 100,
            left: 220,
            fontSize: 15,
            opacity: 0.4,
            color: isDark ? 'rgba(180,200,190,0.35)' : 'rgba(55,65,55,0.35)',
          }}
        >
          ⌣
        </span>

        {/* Hills */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: 280 }}
        >
          <div
            className="absolute bottom-0 rounded-[50%_50%_0_0]"
            style={{
              width: '90%',
              height: 220,
              left: '-5%',
              background: isDark ? hill1Dark : hill1Light,
            }}
          />
          <div
            className="absolute bottom-0 rounded-[50%_50%_0_0]"
            style={{
              width: '110%',
              height: 160,
              left: '15%',
              background: isDark ? hill2Dark : hill2Light,
            }}
          />
          <div
            className="absolute bottom-0 rounded-[50%_50%_0_0]"
            style={{
              width: '60%',
              height: 110,
              left: '45%',
              background: isDark ? hill3Dark : hill3Light,
            }}
          />
        </div>

        {/* Trees */}
        <div
          className="absolute"
          style={{
            left: 80,
            bottom: 200,
            width: 0,
            height: 0,
            borderLeft: '24px solid transparent',
            borderRight: '24px solid transparent',
            borderBottom: '90px solid',
            borderBottomColor: isDark ? '#1A3D2A' : '#2D6A4A',
          }}
        />
        <div
          className="absolute hidden md:block"
          style={{
            left: 520,
            bottom: 80,
            width: 0,
            height: 0,
            borderLeft: '18px solid transparent',
            borderRight: '18px solid transparent',
            borderBottom: '65px solid',
            borderBottomColor: isDark ? '#1A3D2A' : '#2D6A4A',
          }}
        />
        <div
          className="absolute hidden md:block"
          style={{
            left: 620,
            bottom: 70,
            width: 0,
            height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderBottom: '50px solid',
            borderBottomColor: isDark ? '#1A3D2A' : '#2D6A4A',
          }}
        />

        {/* Overlay content */}
        <div
          className="relative z-10 text-center text-white"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
        >
          <div className="mb-4 text-5xl">🌱</div>
          <h2 className="mb-2 text-[clamp(28px,4vw,42px)] font-bold tracking-tight">
            RASSA-JALA
          </h2>
          <p className="max-w-[360px] text-base leading-relaxed opacity-90">
            Conectamos productores locales con compradores directos. Frescura,
            confianza y calidad en cada cosecha.
          </p>
        </div>
      </div>

      {/* RIGHT: Form */}
      <main
        className="flex flex-1 items-center justify-center p-8 md:p-12"
        style={{
          background: isDark ? '#1A211B' : '#FFFFFF',
          color: isDark ? '#E8EAE4' : '#2D3328',
        }}
      >
        <div className="w-full max-w-[420px]">
          <h1 className="mb-8 text-3xl font-bold tracking-tight">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
