  -------------------------------------------------------------------------------------------------------------------

  🎮 Princess — Design System & Styling Rulebook

  -------------------------------------------------------------------------------------------------------------------

  1. Visual Identity & Theme

  Theme: Midnight Puzzle / Cyber-Noir

  The UI communicates focused intelligence in the dark. It's a late-night, heads-down problem-solving aesthetic —
  equal parts hacker terminal and luxury game UI. The background is near-void black, surfaces are barely-visible dark
  navy, and the singular accent (electric purple) fires like a beacon. Color only appears where it means something:
  region tiles, status indicators, and the single CTA per screen.

  Emotional Goals:

   - Calm focus — near-black palette eliminates distraction
   - Prestige — tight spacing, monospaced typography, and pixel-precise borders signal craft
   - Delight — vibrant board regions and glow effects reward attention to detail
   - Momentum — minimal chrome keeps the puzzle front-and-center

  -------------------------------------------------------------------------------------------------------------------

  2. The Color System

  2.1 Core Palette

  ┌──────────────────────┬───────────┬───────────────────────────────────────────────┐
  │ Token                │ Hex       │ Usage                                         │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --bg-void            │ #0D0D12   │ Page background (game content areas)          │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --bg-base            │ #0D1117   │ Root artboard background                      │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --surface-01         │ #141420   │ Cards, modals, nav                            │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --surface-02         │ #0D0D18   │ Nested stats bars, input fields               │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --surface-success    │ #0D180D   │ Success-tinted surface (best time panel)      │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --border-subtle      │ #1E1E2E   │ Default card/input borders                    │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --border-default     │ #2A2A3A   │ Elevated borders (modals, OAuth buttons)      │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --border-nav         │ #21262D   │ Navbar bottom divider                         │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --text-primary       │ #F0F0FF   │ Headlines, body (warm white with slight blue) │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --text-muted         │ #4A4A6A   │ Labels, captions, metadata                    │
  ├──────────────────────┼───────────┼───────────────────────────────────────────────┤
  │ --text-placeholder   │ #3A3A4A   │ Input placeholders                            │
  └──────────────────────┴───────────┴───────────────────────────────────────────────┘

  2.2 Brand Purple (Primary Accent)

  The brand color is always rendered as a two-stop gradient, never flat:

   /* Brand gradient — used on all primary CTAs, logo, active states */
   --gradient-brand: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%);

   /* Full gradient with success endpoint — modal accent bars */
   --gradient-brand-success: linear-gradient(90deg, #7C3AED 0%, #8B5CF6 50%, #22C55E 100%);

  ┌───────────────────────┬───────────┬──────────────────────────────────────────────┐
  │ Functional Token      │ Hex       │ Alpha Variants                               │
  ├───────────────────────┼───────────┼──────────────────────────────────────────────┤
  │ --color-brand         │ #7C3AED   │ 20 = tinted bg, 50 = border, 40 = glow       │
  ├───────────────────────┼───────────┼──────────────────────────────────────────────┤
  │ --color-brand-light   │ #8B5CF6   │ Gradient endpoint                            │
  └───────────────────────┴───────────┴──────────────────────────────────────────────┘

  2.3 Functional / Semantic Colors

  ┌───────────────────┬───────────┬──────────────────────────────────────────────────────────────────────┐
  │ Token             │ Hex       │ Context                                                              │
  ├───────────────────┼───────────┼──────────────────────────────────────────────────────────────────────┤
  │ --color-success   │ #22C55E   │ Solved badges, best time text, solved card border, gradient endpoint │
  ├───────────────────┼───────────┼──────────────────────────────────────────────────────────────────────┤
  │ --color-warning   │ #F59E0B   │ Medium difficulty, timer when paused                                 │
  ├───────────────────┼───────────┼──────────────────────────────────────────────────────────────────────┤
  │ --color-error     │ #EF4444   │ Hard/Expert difficulty, conflict flash                               │
  ├───────────────────┼───────────┼──────────────────────────────────────────────────────────────────────┤
  │ --color-star      │ #F59E0B   │ Rating stars                                                         │
  └───────────────────┴───────────┴──────────────────────────────────────────────────────────────────────┘

  Difficulty badge formula:

   /* All difficulty badges use: bg = color + 15-20 hex opacity, border = color + 40-50 hex opacity */
   .badge-easy    { background: #22C55E20; border-color: #22C55E50; color: #22C55E; }
   .badge-medium  { background: #F59E0B15; border-color: #F59E0B40; color: #F59E0B; }
   .badge-hard    { background: #EF444415; border-color: #EF444440; color: #EF4444; }
   .badge-level   { background: #7C3AED20; border-color: #7C3AED50; color: #8B5CF6; }

  2.4 Board Region Colors

  Eight distinct colored regions, rendered at 40% background opacity (66 hex) with 80% border opacity (CC hex):

  ┌────────┬───────────┬─────────────┬──────────────┐
  │ Region │ Base Hex  │ BG Color    │ Border Color │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Red    │ #E74C3C   │ #E74C3C66   │ #E74C3CCC    │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Teal   │ #1ABC9C   │ #1ABC9C66   │ #1ABC9CCC    │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Golden │ #F1C40F   │ #F1C40F66   │ #F1C40FCC    │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Green  │ #2ECC71   │ #2ECC7166   │ #2ECC71CC    │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Purple │ #9B59B6   │ #9B59B666   │ #9B59B6CC    │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Blue   │ #3498DB   │ #3498DB66   │ #3498DBCC    │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Orange │ #E67E22   │ #E67E2266   │ #E67E22CC    │
  ├────────┼───────────┼─────────────┼──────────────┤
  │ Pink   │ #E91E8C   │ #E91E8C66   │ #E91E8CCC    │
  └────────┴───────────┴─────────────┴──────────────┘

  2.5 Glow Logic

   /* Applied via box-shadow */
   --glow-brand-xl:  0px 0px 80px #7C3AED30; /* Victory modal ambient glow */
   --glow-brand-lg:  0px 0px 24px #7C3AED40; /* Primary CTA button glow */
   --glow-brand-md:  0px 0px 20px #7C3AED25; /* Active level card glow */
   --glow-brand-sm:  0px 0px 12px #7C3AED30; /* Subtle interactive glow */
   --glow-depth:     0px 40px 80px #00000080; /* Depth shadow below modals */

  -------------------------------------------------------------------------------------------------------------------

  3. Typography Architecture

  Two fonts, rigorously divided:

  ┌──────────────────────────┬──────────────────┬────────────────────────────────────────────────────────┐
  │ Role                     │ Font             │ Rationale                                              │
  ├──────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
  │ Display / Brand / UI     │ JetBrains Mono   │ Monospaced precision signals intelligence; brand voice │
  ├──────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
  │ Body / Descriptions      │ Inter            │ Proportional readability for multi-line prose          │
  └──────────────────────────┴──────────────────┴────────────────────────────────────────────────────────┘

  3.1 Type Scale

  ┌──────────────┬───────────┬──────┬────────┬─────────┬───────────┬───────────┬─────────────────────────────────────┐
  │ Name         │ Font      │ Size │ Weight │ Line    │ Letter    │ Color     │ Usage                               │
  │              │           │      │        │ Height  │ Spacing   │           │                                     │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Hero         │ JetBrains │ 72px │ 900    │ 80px    │ –0.5px    │ #F0F0FF   │ Landing headline ("Place your       │
  │              │ Mono      │      │        │         │           │           │ queens.")                           │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ H1           │ JetBrains │ 36px │ 900    │ 44px    │ –0.3px    │ #F0F0FF   │ "Solved!", "Paused", "Welcome back" │
  │              │ Mono      │      │        │         │           │           │                                     │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ H2           │ JetBrains │ 30px │ 900    │ 36px    │ –0.2px    │ #F0F0FF   │ "Choose a Level", "Place the        │
  │              │ Mono      │      │        │         │           │           │ Queens."                            │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ H3           │ JetBrains │ 20px │ 700    │ 28px    │ 0         │ #F0F0FF   │ Level card titles ("Diagonal",      │
  │              │ Mono      │      │        │         │           │           │ "Starter")                          │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Body         │ Inter     │ 14px │ 400    │ 22px    │ 0         │ #F0F0FF   │ Rule descriptions, form copy        │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Body SM      │ Inter     │ 13px │ 400    │ 20px    │ 0         │ #4A4A6A   │ Secondary descriptions              │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Mono Display │ JetBrains │ 48px │ 700    │ 56px    │ –1px      │ #F0F0FF   │ Game timer (02:34)                  │
  │              │ Mono      │      │        │         │           │           │                                     │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Label        │ JetBrains │ 11px │ 400    │ 14px    │ 3px       │ #4A4A6A   │ Section labels ("TIME", "QUEENS     │
  │              │ Mono      │      │        │         │           │           │ PUZZLE") — ALL CAPS                 │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Caption      │ JetBrains │ 12px │ 400    │ 16px    │ 1px       │ #4A4A6A   │ Footer notices ("MORE LEVELS COMING │
  │              │ Mono      │      │        │         │           │           │ SOON")                              │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Wordmark     │ JetBrains │ 16px │ 700    │ 20px    │ 0         │ #F0F0FF   │ "Princess" brand name in navbar     │
  │              │ Mono      │      │        │         │           │           │                                     │
  ├──────────────┼───────────┼──────┼────────┼─────────┼───────────┼───────────┼─────────────────────────────────────┤
  │ Button       │ JetBrains │ 14px │ 700    │ 18px    │ 0         │ #F0F0FF   │ All button labels                   │
  │              │ Mono      │      │        │         │           │           │                                     │
  └──────────────┴───────────┴──────┴────────┴─────────┴───────────┴───────────┴─────────────────────────────────────┘

  Accent rule: On the landing page, the word "queens." in the hero is set in --gradient-brand applied as
  -webkit-background-clip: text for the purple highlight effect.

  -------------------------------------------------------------------------------------------------------------------

  4. Component Specifications

  4.1 The Game Board Grid

   Cell size (desktop):   90 × 90px
   Cell size (mobile):    ~52 × 52px
   Cell border-radius:    6px
   Gap between cells:     3px
   Board border-radius:   8px
   Board total (7×7):     648 × 648px = (7 × 90) + (6 × 3)

   Cell anatomy:
     - Background: region color at 40% opacity (#RRGGBB66)
     - Border: region color at 80% opacity (#RRGGBBCC), 1px solid
     - Empty state: flat fill, no decorations

   Cell states:
     - Empty:    base region fill
     - Marked X: × glyph centered, no background change, muted white
     - Queen:    ★ icon in circle (region accent color), border glows
     - Conflict: red flash overlay (#EF444430), border turns #EF4444
     - Hover:    brightness 110%, cursor pointer, transition 100ms ease

  4.2 Buttons

  Primary (CTA — "Play Free", "Next Level", "Resume", "Sign In"):

   .btn-primary {
     background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%);
     border-radius: 8px;        /* 10px on large variants */
     padding: 12px 18px;        /* 14px block on large */
     color: #F0F0FF;
     font-family: 'JetBrains Mono', monospace;
     font-weight: 700;
     font-size: 14px;
     box-shadow: 0px 0px 24px #7C3AED40;
     border: none;
     cursor: pointer;
     transition: filter 150ms ease, box-shadow 150ms ease;
   }
   .btn-primary:hover {
     filter: brightness(1.1);
     box-shadow: 0px 0px 32px #7C3AED60;
   }
   .btn-primary:active { filter: brightness(0.95); }

  Secondary / Ghost ("Restart", "All Levels", "Play Again", "How to Play"):

   .btn-secondary {
     background: transparent;
     border-radius: 8px;
     padding: 12px 18px;
     color: #F0F0FF;
     font-family: 'JetBrains Mono', monospace;
     font-weight: 600;
     font-size: 14px;
     border: 1px solid #2A2A3A;
     cursor: pointer;
     transition: background 150ms ease, border-color 150ms ease;
   }
   .btn-secondary:hover {
     background: #141420;
     border-color: #3A3A4A;
   }

  Icon Button (back-arrow nav):

   .btn-icon {
     display: flex; align-items: center; gap: 6px;
     border-radius: 8px;
     padding: 8px 14px;
     border: 1px solid #2A2A3A;
     background: transparent;
     color: #F0F0FF;
     font-size: 14px;
   }

  Keyboard Badge (shortcut keys — "Click", "Esc", "Space"):

   .kbd-badge {
     background: #141420;
     border: 1px solid #2A2A3A;
     border-radius: 6px;
     padding: 4px 10px;
     font-family: 'JetBrains Mono', monospace;
     font-size: 12px;
     color: #F0F0FF;
   }

  4.3 Cards & Modals (Glassmorphism Rules)

  Modal / Victory Card / Pause Card:

   .modal {
     background: #141420;
     border: 1px solid #2A2A3A;
     border-radius: 20px;
     overflow: hidden;          /* clips the top accent bar */
     box-shadow:
       0px 0px 80px #7C3AED30,  /* ambient purple glow */
       0px 40px 80px #00000080; /* depth shadow */
   }

   /* Top accent stripe — always present on modals */
   .modal__accent-bar {
     width: 100%;
     height: 3px;               /* 4px on victory modal */
     background: linear-gradient(90deg, #7C3AED, #8B5CF6 50%, #22C55E 100%);
     /* Pause modal uses purple-only: linear-gradient(90deg, #7C3AED, #8B5CF6) */
   }

   .modal__body {
     padding: 40px 48px;
     gap: 24-28px;
   }

  Level Card (default / solved / active):

   /* Base */
   .level-card {
     background: #141420;
     border: 1px solid #1E1E2E;
     border-radius: 12px;
     padding: 20px 22px;
   }
   /* Solved — left accent bar */
   .level-card--solved {
     border-left: 3px solid #22C55E;
   }
   /* Currently Playing — purple glow */
   .level-card--active {
     background: linear-gradient(135deg, #1A0A35 0%, #200E46 100%);
     border-color: #7C3AED60;
     box-shadow: 0px 0px 20px #7C3AED25;
   }
   /* Coming Soon — dimmed */
   .level-card--soon {
     opacity: 0.4;
     border-style: dashed;
   }

  Stats / Info Bar (inside modals):

   .stats-bar {
     background: #0D0D18;
     border: 1px solid #1E1E2E;
     border-radius: 12px;
     padding: 16px 20px;
     display: flex;
     justify-content: space-between;
     align-items: center;
   }
   /* Best time variant */
   .stats-bar--success {
     background: #0D180D;
     border-color: #1A2E1A;
   }

  Input Field:

   .input {
     background: #0D0D18;
     border: 1px solid #1E1E2E;
     border-radius: 8px;
     padding: 12px 16px;
     color: #F0F0FF;
     font-family: 'JetBrains Mono', monospace;
     font-size: 14px;
     width: 100%;
     transition: border-color 150ms ease;
   }
   .input:focus {
     border-color: #7C3AED60;
     outline: none;
     box-shadow: 0 0 0 2px #7C3AED20;
   }

  Pill Badge:

   .badge {
     border-radius: 100px;
     padding: 5px 14px;
     font-family: 'JetBrains Mono', monospace;
     font-size: 11px;
     font-weight: 600;
     letter-spacing: 0.5px;
     text-transform: uppercase;
     border: 1px solid;
   }

  4.4 Navbar

   .navbar {
     height: 72px;
     padding: 0 64px;           /* 16px on mobile */
     display: flex;
     align-items: center;
     justify-content: space-between;
     border-bottom: 1px solid #21262D;
     background: #141420;       /* slightly lifted from page bg */
   }

   /* Logo mark */
   .logo-icon {
     width: 32px; height: 32px;
     border-radius: 8px;
     background: linear-gradient(135deg, #7C3AED, #8B5CF6);
     display: flex; align-items: center; justify-content: center;
   }

  4.5 Tab Switcher (Sign In / Sign Up)

   .tab-group {
     background: #0D0D18;
     border-radius: 10px;
     padding: 4px;
     display: flex;
     gap: 4px;
   }
   .tab-item { border-radius: 7px; padding: 9px; flex: 1; }
   .tab-item--active {
     background: linear-gradient(135deg, #7C3AED, #8B5CF6);
   }
   .tab-item--inactive { background: transparent; }

  4.6 Sign-In Split-Panel

   .auth-panel-left {
     width: 560px;
     background: linear-gradient(160deg, #1A0A28 0%, #0F0F16 60%);
     border-right: 1px solid #1E1E2E;
     padding: 60px;
     display: flex; flex-direction: column;
     align-items: center; justify-content: center;
     gap: 32px;
   }

  -------------------------------------------------------------------------------------------------------------------

  5. States & Feedback

  ┌───────────────────────┬─────────────────────────────────────────────────────────────────────────┐
  │ State                 │ Visual Treatment                                                        │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Hover (cell)          │ filter: brightness(1.15), cursor: pointer, transition: 100ms ease       │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Hover (button)        │ filter: brightness(1.1), subtle glow intensification                    │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Active/Pressed        │ filter: brightness(0.9), transform: scale(0.98)                         │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Disabled              │ opacity: 0.4, cursor: not-allowed, no glow                              │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Focused (input)       │ border-color: #7C3AED60, box-shadow: 0 0 0 2px #7C3AED20                │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Queen placed          │ Star icon in region-color ring, border: 2px solid <region-color>        │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ X marked              │ × symbol, color: #F0F0FF80, no background change                        │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Conflict              │ Cell background flashes #EF444430, border turns #EF444480               │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Solved (puzzle)       │ Level card gets green left accent, modal appears with glow              │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Progress bar fill     │ background: linear-gradient(90deg, #7C3AED, #8B5CF6), track #1E1E2E     │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Streak active         │ 🔥 emoji + green number, color: #22C55E                                 │
  ├───────────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Card Playing          │ Purple gradient bg + border glow + "Playing" orange dot badge           │
  └───────────────────────┴─────────────────────────────────────────────────────────────────────────┘

  -------------------------------------------------------------------------------------------------------------------

  6. Technical Implementation

  6.1 tailwind.config.js

   // tailwind.config.js
   const { fontFamily } = require('tailwindcss/defaultTheme')

   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
     theme: {
       extend: {
         colors: {
           // Backgrounds
           void:    '#0D0D12',
           base:    '#0D1117',
           // Surfaces
           surface: {
             DEFAULT: '#141420',
             deep:    '#0D0D18',
             success: '#0D180D',
           },
           // Borders
           border: {
             subtle:  '#1E1E2E',
             default: '#2A2A3A',
             nav:     '#21262D',
           },
           // Text
           text: {
             primary: '#F0F0FF',
             muted:   '#4A4A6A',
             ghost:   '#3A3A4A',
           },
           // Brand
           brand: {
             DEFAULT: '#7C3AED',
             light:   '#8B5CF6',
           },
           // Functional
           success: '#22C55E',
           warning: '#F59E0B',
           danger:  '#EF4444',
           // Board Regions
           region: {
             red:    '#E74C3C',
             teal:   '#1ABC9C',
             gold:   '#F1C40F',
             green:  '#2ECC71',
             purple: '#9B59B6',
             blue:   '#3498DB',
             orange: '#E67E22',
             pink:   '#E91E8C',
           },
         },

         fontFamily: {
           mono:  ['"JetBrains Mono"', 'monospace', ...fontFamily.mono],
           sans:  ['Inter', 'system-ui', ...fontFamily.sans],
         },

         fontSize: {
           'hero':    ['72px',  { lineHeight: '80px',  fontWeight: '900', letterSpacing: '-0.5px' }],
           'h1':      ['36px',  { lineHeight: '44px',  fontWeight: '900' }],
           'h2':      ['30px',  { lineHeight: '36px',  fontWeight: '900' }],
           'h3':      ['20px',  { lineHeight: '28px',  fontWeight: '700' }],
           'body':    ['14px',  { lineHeight: '22px',  fontWeight: '400' }],
           'body-sm': ['13px',  { lineHeight: '20px',  fontWeight: '400' }],
           'timer':   ['48px',  { lineHeight: '56px',  fontWeight: '700', letterSpacing: '-1px' }],
           'label':   ['11px',  { lineHeight: '14px',  fontWeight: '400', letterSpacing: '3px' }],
           'caption': ['12px',  { lineHeight: '16px',  fontWeight: '400', letterSpacing: '1px' }],
         },

         borderRadius: {
           modal:   '20px',
           card:    '12px',
           btn:     '8px',
           logo:    '8px',
           pill:    '100px',
           cell:    '6px',
         },

         boxShadow: {
           'glow-xl':   '0px 0px 80px #7C3AED30, 0px 40px 80px #00000080',
           'glow-lg':   '0px 0px 24px #7C3AED40',
           'glow-md':   '0px 0px 20px #7C3AED25',
           'glow-sm':   '0px 0px 12px #7C3AED30',
           'depth':     '0px 40px 80px #00000080',
         },

         backgroundImage: {
           'gradient-brand':         'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
           'gradient-brand-success': 'linear-gradient(90deg, #7C3AED 0%, #8B5CF6 50%, #22C55E 100%)',
           'gradient-auth-panel':    'linear-gradient(160deg, #1A0A28 0%, #0F0F16 60%)',
           'gradient-active-card':   'linear-gradient(135deg, #1A0A35 0%, #200E46 100%)',
         },
       },
     },
     plugins: [],
   }

  6.2 CSS Custom Properties (:root)

   /* globals.css */
   :root {
     /* ── Core Surfaces ────────────────────────────── */
     --bg-void:           #0D0D12;
     --bg-base:           #0D1117;
     --surface-01:        #141420;
     --surface-02:        #0D0D18;
     --surface-success:   #0D180D;

     /* ── Borders ──────────────────────────────────── */
     --border-subtle:     #1E1E2E;
     --border-default:    #2A2A3A;
     --border-nav:        #21262D;

     /* ── Text ─────────────────────────────────────── */
     --text-primary:      #F0F0FF;
     --text-muted:        #4A4A6A;

     /* ── Brand ────────────────────────────────────── */
     --brand:             #7C3AED;
     --brand-light:       #8B5CF6;
     --gradient-brand:    linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%);
     --gradient-brand-success: linear-gradient(90deg, #7C3AED 0%, #8B5CF6 50%, #22C55E 100%);

     /* ── Functional ───────────────────────────────── */
     --color-success:     #22C55E;
     --color-warning:     #F59E0B;
     --color-error:       #EF4444;

     /* ── Glow Effects ─────────────────────────────── */
     --glow-xl:   0px 0px 80px rgba(124,58,237,.188), 0px 40px 80px rgba(0,0,0,.502);
     --glow-lg:   0px 0px 24px rgba(124,58,237,.251);
     --glow-md:   0px 0px 20px rgba(124,58,237,.145);
     --glow-sm:   0px 0px 12px rgba(124,58,237,.188);

     /* ── Board Regions ────────────────────────────── */
     --region-red:    #E74C3C;
     --region-teal:   #1ABC9C;
     --region-gold:   #F1C40F;
     --region-green:  #2ECC71;
     --region-purple: #9B59B6;
     --region-blue:   #3498DB;
     --region-orange: #E67E22;
     --region-pink:   #E91E8C;

     /* ── Region cell formula ──────────────────────── */
     /* background: <region>66 (40% opacity)           */
     /* border: 1px solid <region>CC (80% opacity)     */

     /* ── Typography ───────────────────────────────── */
     --font-display: 'JetBrains Mono', monospace;
     --font-body:    'Inter', system-ui, sans-serif;
   }

  6.3 Utility Classes for Glow Overlays

   /* For sign-in/landing page ambient purple background glow */
   .bg-ambient-purple::before {
     content: '';
     position: absolute;
     inset: 0;
     background: radial-gradient(ellipse 60% 50% at 30% 40%, rgba(124,58,237,0.15) 0%, transparent 70%);
     pointer-events: none;
   }

   /* Queen cell ring */
   .cell-queen {
     box-shadow: inset 0 0 0 2px currentColor, 0 0 12px currentColor;
   }

   /* Conflict cell flash — apply with JS animation trigger */
   .cell-conflict {
     background-color: #EF444430 !important;
     border-color: #EF444480 !important;
     animation: conflict-flash 400ms ease;
   }

   @keyframes conflict-flash {
     0%, 100% { opacity: 1; }
     50%       { opacity: 0.5; }
   }

  -------------------------------------------------------------------------------------------------------------------

  Summary: What a new developer needs to know

   1. Every surface is dark navy, not pure black — use the surface token not #000
   2. Purple is the only brand color — use the gradient, never flat #7C3AED
   3. JetBrains Mono is the display AND UI font — Inter is body prose only
   4. Labels are always uppercase, monospaced, 3px letter-spaced, muted (#4A4A6A)
   5. Every modal has a colored top-bar gradient — never float a modal without it
   6. Board region colors use the color66/colorCC opacity formula — never solid fills
   7. Glow is additive — primary CTAs and modals always emit a purple box-shadow radiance