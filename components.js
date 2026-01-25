document.addEventListener("DOMContentLoaded", async function () {
    // 1. Auth Page Check
    const isAuthPage = document.getElementById('auth-page') || 
                       window.location.pathname.includes('register.html') || 
                       window.location.pathname.includes('login.html');

    // 2. Inject Dots Background
    const dotsHTML = `<div class="dots-container"><div class="dots dots-white"></div><div class="dots dots-cyan"></div></div>`;
    document.body.insertAdjacentHTML('afterbegin', dotsHTML);

    if (isAuthPage) return;

    // 3. Check Wallet Status
    let walletAddress = "";
    let isConnected = false;
    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            walletAddress = accounts[0];
            isConnected = true;
        }
    }

    // --- REUSABLE NEW LOGO SVG TEMPLATE ---
    const newLogoSVG = `
        <div class="relative w-10 h-10 flex items-center justify-center">
            <div class="absolute inset-0 bg-yellow-500/20 blur-lg rounded-full"></div>
            <svg viewBox="0 0 100 100" class="w-full h-full relative z-10 drop-shadow-lg">
                <defs>
                    <linearGradient id="gold-grad-js" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#B8860B;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="url(#gold-grad-js)" stroke-width="4"/>
                <path d="M30 70 L30 40 L40 50 L50 30 L60 50 L70 40 L70 70 Z" fill="url(#gold-grad-js)"/>
                <rect x="30" y="73" width="40" height="4" rx="2" fill="url(#gold-grad-js)"/>
            </svg>
        </div>
    `;

    // 4. Inject Navbar (Desktop) - Updated with New Logo
    const navHTML = `
        <nav class="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-50">
            <div class="flex items-center gap-3 cursor-pointer group" onclick="location.href='index1.html'">
                ${newLogoSVG}
                <div class="flex flex-col">
                    <span class="text-xl font-black orbitron tracking-tighter leading-none uppercase">
                        EXGEE <span class="text-yellow-500">USDT</span>
                    </span>
                    <span class="text-[8px] font-bold tracking-[0.3em] text-gray-500 uppercase mt-1">Smart Defi Pro</span>
                </div>
            </div>
            
            <div class="hidden md:flex gap-4">
                <button class="gold-btn !py-2 !px-5" onclick="location.href='index1.html'">Dashboard</button>
                <button class="gold-btn !py-2 !px-5" onclick="location.href='referral.html'">Referral</button>
                <button class="gold-btn !py-2 !px-5" onclick="location.href='history.html'">History</button>
            </div>
            
            <div class="flex items-center gap-2 relative">
                <button id="connect-btn" onclick="handleLogin()" class="gold-btn">
                    ${isConnected ? walletAddress.substring(0, 6) + "..." + walletAddress.substring(38) : "Connect Wallet"}
                </button>
                
                ${isConnected ? `
                <button id="logout-icon-btn" onclick="handleLogout()" 
                    class="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all cursor-pointer flex items-center justify-center"
                    title="Logout">
                    <i data-lucide="power" class="w-5 h-5"></i>
                </button>
                ` : ''}
            </div>
        </nav>
    `;
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // 5. Inject Premium Floating Mobile Navigation
    const mobileNavHTML = `
        <div class="fixed bottom-6 left-4 right-4 md:hidden z-[9999]">
            <div class="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl flex justify-around items-center p-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                <a href="index1.html" class="flex flex-col items-center gap-1 transition-all ${window.location.pathname.includes('index1.html') ? 'text-yellow-500 scale-110' : 'text-gray-400'}">
                    <div class="p-2 rounded-2xl ${window.location.pathname.includes('index1.html') ? 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}">
                        <i data-lucide="layout-dashboard" class="w-6 h-6"></i>
                    </div>
                    <span class="text-[9px] font-bold orbitron">HOME</span>
                </a>
                
                <a href="referral.html" class="flex flex-col items-center gap-1 transition-all ${window.location.pathname.includes('referral.html') ? 'text-yellow-500 scale-110' : 'text-gray-400'}">
                    <div class="p-2 rounded-2xl ${window.location.pathname.includes('referral.html') ? 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}">
                        <i data-lucide="users-2" class="w-6 h-6"></i>
                    </div>
                    <span class="text-[9px] font-bold orbitron">TEAM</span>
                </a>
                
                <a href="history.html" class="flex flex-col items-center gap-1 transition-all ${window.location.pathname.includes('history.html') ? 'text-yellow-500 scale-110' : 'text-gray-400'}">
                    <div class="p-2 rounded-2xl ${window.location.pathname.includes('history.html') ? 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}">
                        <i data-lucide="history" class="w-6 h-6"></i>
                    </div>
                    <span class="text-[9px] font-bold orbitron">TRANS</span>
                </a>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', mobileNavHTML);

    // 6. Inject Luxury Footer - Updated Branding
    const footerHTML = `
        <footer class="p-20 text-center border-t border-white/5 relative z-10 mb-20 md:mb-0">
            <div class="flex flex-col items-center gap-2">
                <p class="orbitron font-black text-2xl italic">EXGEE <span class="text-yellow-500 uppercase">USDT</span></p>
                <p class="text-gray-600 text-[10px] tracking-[0.8em] uppercase">Decentralized Finance • Smart Pro © 2026</p>
            </div>
        </footer>
    `;
    
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = footerHTML;
    } else {
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
});
