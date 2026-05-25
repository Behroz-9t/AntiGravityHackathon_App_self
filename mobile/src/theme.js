// ─── اهلِ فن Design System Tokens ───────────────────────────────────────────
export const T = {
    // Base surfaces (Premium Charcoal Grey & Glassmorphic shades)
    bg:          '#0A0B0D',       // Deep obsidian charcoal
    card:        '#121417',       // Charcoal card base
    elevated:    '#1A1D22',       // Light charcoal surface
    border:      'rgba(255, 255, 255, 0.08)',  // Glass border reflection
    borderLight: 'rgba(255, 255, 255, 0.16)',  // Highlighted glass border

    // Brand Colors
    brand1:      '#121417',
    brand2:      '#38BDF8',       // Refined Ice Blue
    accent1:     '#D4AF37',       // Luxury Gold
    accent2:     '#E2E8F0',       // Platinum Silver

    // Semantic
    success:     '#10B981',       // Emerald Green
    warning:     '#F59E0B',       // Amber Yellow
    error:       '#EF4444',       // Rose Red
    info:        '#06B6D4',       // Cyan Info

    // Text
    text:        '#0A0B0D',       // Dark text (for rare light backgrounds)
    textLight:   '#F8FAFC',       // Clean off-white
    sub:         '#94A3B8',       // Muted slate gray
    placeholder: '#475569',       // Darker slate gray for inputs

    // Spacing (8pt grid)
    sp1: 4, sp2: 8, sp3: 12, sp4: 16, sp5: 20,
    sp6: 24, sp8: 32, sp10: 40, sp12: 48, sp16: 64,

    // Radius
    r1: 8, r2: 12, r3: 14, r4: 16, r5: 20, r6: 24, r7: 28,

    // Typography helpers
    fDisplay: { fontSize: 32, fontWeight: '700', letterSpacing: -0.3, lineHeight: 38 },
    fH1:      { fontSize: 24, fontWeight: '600', letterSpacing: -0.3, lineHeight: 29 },
    fH2:      { fontSize: 20, fontWeight: '600', letterSpacing: -0.3, lineHeight: 24 },
    fH3:      { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, lineHeight: 19 },
    fBody:    { fontSize: 14, fontWeight: '400', lineHeight: 21 },
    fCaption: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
    fLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
};

export const getTheme = (isDarkMode) => {
    const isDark = isDarkMode !== false; // default true
    return {
        ...T, // inherit base tokens
        bg:          isDark ? '#0A0B0D' : '#F8FAFC',
        card:        isDark ? '#121417' : '#FFFFFF',
        elevated:    isDark ? '#1A1D22' : '#F1F5F9',
        border:      isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        borderLight: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.16)',
        textLight:   isDark ? '#F8FAFC' : '#0F172A',
        text:        isDark ? '#0A0B0D' : '#F8FAFC',
        sub:         isDark ? '#94A3B8' : '#475569',
        placeholder: isDark ? '#475569' : '#94A3B8',
    };
};

export const GRADIENTS = {
    brand:    ['#38BDF8', '#0284C7'],              // Refined Ice Blue gradient
    brandHero:['#1A1D22', '#0A0B0D'],              // Charcoal black gradient
    accent:   ['#F59E0B', '#D4AF37'],              // Luxury Gold/Amber gradient
    card:     ['rgba(27, 29, 34, 0.9)', 'rgba(18, 20, 23, 0.95)'], // Glassmorphic card gradient
    dark:     ['#121417', '#0A0B0D'],
    darkCard: ['#1A1D22', '#121417'],
    glass:    ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'],
    charcoal: ['#1E222B', '#121417'],
};

export const getGradients = (isDarkMode) => {
    const isDark = isDarkMode !== false;
    return {
        ...GRADIENTS,
        brandHero: isDark ? ['#1A1D22', '#0A0B0D'] : ['#F1F5F9', '#F8FAFC'],
        card:      isDark ? ['rgba(27, 29, 34, 0.9)', 'rgba(18, 20, 23, 0.95)'] : ['#FFFFFF', '#F8FAFC'],
        dark:      isDark ? ['#121417', '#0A0B0D'] : ['#FFFFFF', '#F8FAFC'],
        darkCard:  isDark ? ['#1A1D22', '#121417'] : ['#F1F5F9', '#FFFFFF'],
        charcoal:  isDark ? ['#1E222B', '#121417'] : ['#E2E8F0', '#F8FAFC'],
    };
};

export const SHADOWS = {
    card:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 },
    focus:    { shadowColor: '#38BDF8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 6 },
    btn:      { shadowColor: '#38BDF8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
    accent:   { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
};
