// ─── اہلِ فن Design System Tokens ───────────────────────────────────────────
export const T = {
    // Base surfaces (Premium Charcoal Grey & Glassmorphic shades)
    bg:          '#0B0C0E',       // Obsidian Midnight Black
    card:        '#15181F',       // Charcoal Slate card base
    elevated:    '#1C1F27',       // Lighter Slate surface
    border:      'rgba(245, 197, 24, 0.08)',  // Subtle gold reflection
    borderLight: 'rgba(245, 197, 24, 0.16)',  // Highlighted gold reflection

    // Brand Colors
    brand1:      '#15181F',
    brand2:      '#F5C518',       // Premium Gold
    accent1:     '#F5C518',       // Premium Gold
    accent2:     '#E2E8F0',       // Platinum Silver

    // Semantic
    success:     '#10B981',       // Emerald Green
    warning:     '#F59E0B',       // Amber Yellow
    error:       '#EF4444',       // Rose Red
    info:        '#F5C518',       // Info mapped to Gold

    // Text
    text:        '#0B0C0E',       // Dark text
    textLight:   '#FFFFFF',       // White active text
    sub:         '#8E94A2',       // Slate Gray muted text
    placeholder: '#475569',       // Darker slate gray for inputs

    // Spacing (8pt grid)
    sp1: 4, sp2: 8, sp3: 12, sp4: 16, sp5: 20,
    sp6: 24, sp8: 32, sp10: 40, sp12: 48, sp16: 64,

    // Radius (Smooth, large Apple-like corners)
    r1: 8, r2: 12, r3: 16, r4: 20, r5: 24, r6: 28, r7: 32,

    // Typography helpers
    fDisplay: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, lineHeight: 38 },
    fH1:      { fontSize: 24, fontWeight: '700', letterSpacing: -0.4, lineHeight: 29 },
    fH2:      { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24 },
    fH3:      { fontSize: 16, fontWeight: '650', letterSpacing: -0.2, lineHeight: 19 },
    fBody:    { fontSize: 14, fontWeight: '400', lineHeight: 21 },
    fCaption: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
    fLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
};

export const getTheme = (isDarkMode) => {
    // Return unified premium Obsidian & Gold theme always to keep branding solid and clean
    return {
        ...T,
        bg:          '#0B0C0E',
        card:        '#15181F',
        elevated:    '#1C1F27',
        border:      'rgba(245, 197, 24, 0.08)',
        borderLight: 'rgba(245, 197, 24, 0.16)',
        textLight:   '#FFFFFF',
        text:        '#0B0C0E',
        sub:         '#8E94A2',
        placeholder: '#475569',
    };
};

export const GRADIENTS = {
    brand:    ['#F5C518', '#E5A93B'],              // Premium gold to deep gold gradient
    brandHero:['#15181F', '#0B0C0E'],              // Charcoal black gradient
    accent:   ['#F5C518', '#E5A93B'],              // Gold gradient
    card:     ['rgba(28, 31, 39, 0.95)', 'rgba(21, 24, 31, 0.98)'], // Charcoal card gradient
    dark:     ['#15181F', '#0B0C0E'],
    darkCard: ['#1C1F27', '#15181F'],
    glass:    ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)'],
    charcoal: ['#1C1F27', '#15181F'],
};

export const getGradients = (isDarkMode) => {
    return {
        ...GRADIENTS,
        brandHero: ['#15181F', '#0B0C0E'],
        card:      ['rgba(28, 31, 39, 0.95)', 'rgba(21, 24, 31, 0.98)'],
        dark:      ['#15181F', '#0B0C0E'],
        darkCard:  ['#1C1F27', '#15181F'],
        charcoal:  ['#1C1F27', '#15181F'],
    };
};

export const SHADOWS = {
    card:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 5 },
    focus:    { shadowColor: '#F5C518', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
    btn:      { shadowColor: '#F5C518', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
    accent:   { shadowColor: '#F5C518', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 6 },
};
