import React, { createContext, useContext, useState } from 'react';

const SidePanelContext = createContext(null);

export function SidePanelProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('workflows'); // 'bookings' | 'workflows'

    const togglePanel = () => setIsOpen(!isOpen);
    const closePanel = () => setIsOpen(false);
    const openPanel = () => setIsOpen(true);
    const switchTab = (tab) => setActiveTab(tab);

    return (
        <SidePanelContext.Provider value={{
            isOpen,
            activeTab,
            togglePanel,
            closePanel,
            openPanel,
            switchTab,
        }}>
            {children}
        </SidePanelContext.Provider>
    );
}

export function useSidePanel() {
    const context = useContext(SidePanelContext);
    if (!context) {
        throw new Error('useSidePanel must be used within SidePanelProvider');
    }
    return context;
}
