/*
============================================================
Matthew Pizzitola Portfolio - Site JavaScript
============================================================
This file contains all behavior for the single-page portfolio:
- reduced-motion accessibility preference
- mobile navigation and section highlighting
- project search/filter controls
- journal timeline, filters, and blog cards
- shared hover/tilt effects
- contact form submission

The HTML file owns the page structure, style.css owns presentation,
and this file owns interaction/state.
============================================================
*/

const PORTFOLIO_BACKEND_URL = "https://script.google.com/macros/s/AKfycbxjLNchs1moHEPlfglHJzO0f0XdqRWMsg9Tlj6-UzRYq5RnWTSyPreK1-9j_tFrJZmJ/exec";


/*
------------------------------------------------------------
1. Motion Accessibility Preference
Respects the system reduced-motion setting, then lets visitors override it from the nav toggle.
------------------------------------------------------------
*/
const motionStorageKey = "matthewPortfolioReducedMotion";
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let savedMotionPreference = null;

// Read a saved visitor preference first; if none exists, the system preference decides.
try{
    savedMotionPreference = window.localStorage.getItem(motionStorageKey);
}catch(error){
    savedMotionPreference = null;
}

// Single source of truth for whether optional motion should currently be reduced.
function isReducedMotionEnabled(){
    if(savedMotionPreference === "true"){
        return true;
    }

    if(savedMotionPreference === "false"){
        return false;
    }

    return motionQuery.matches;
}

// Clears cursor-driven transforms so cards do not stay tilted after motion is reduced.
function resetAllTiltCards(){
    document.querySelectorAll(".tilt-card").forEach((card) => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
        card.style.setProperty("--glow-x", "50%");
        card.style.setProperty("--glow-y", "50%");
    });
}

// Applies the current motion preference to CSS and updates every nav toggle instance.
function applyReducedMotionPreference(){
    const reducedMotionEnabled = isReducedMotionEnabled();
    document.documentElement.dataset.motion = reducedMotionEnabled ? "reduced" : "full";

    document.querySelectorAll(".motion-toggle").forEach((button) => {
        button.setAttribute("aria-pressed", String(reducedMotionEnabled));
        button.title = reducedMotionEnabled ? "Reduced motion is on" : "Reduced motion is off";
    });

    if(reducedMotionEnabled){
        resetAllTiltCards();
    }
}

// Saves a manual user choice and immediately reapplies the visual state.
function setReducedMotionPreference(enabled){
    savedMotionPreference = String(enabled);

    try{
        window.localStorage.setItem(motionStorageKey, savedMotionPreference);
    }catch(error){
        // The toggle still works for this page load if storage is unavailable.
    }

    applyReducedMotionPreference();
}

// If the visitor has not chosen manually, stay synced with OS/browser preference changes.
function handleSystemMotionChange(){
    if(savedMotionPreference === null){
        applyReducedMotionPreference();
    }
}

if(typeof motionQuery.addEventListener === "function"){
    motionQuery.addEventListener("change", handleSystemMotionChange);
}else if(typeof motionQuery.addListener === "function"){
    motionQuery.addListener(handleSystemMotionChange);
}

applyReducedMotionPreference();


/*
------------------------------------------------------------
2. Mobile Navigation and About Tabs
Handles the small-screen menu drawer and switches the About section tab panels.
------------------------------------------------------------
*/
const tablinks = document.getElementsByClassName("tab-links");
const tabcontents = document.getElementsByClassName("tab-contents");

// Switches About tabs while keeping both visual and accessibility state aligned.
function opentab(event, tabname){
    for(const tablink of tablinks){
        tablink.classList.remove("active-link");
        tablink.setAttribute("aria-selected", "false");
    }
    for(const tabcontent of tabcontents){
        tabcontent.classList.remove("active-tab");
        tabcontent.hidden = true;
    }
    event.currentTarget.classList.add("active-link");
    event.currentTarget.setAttribute("aria-selected", "true");
    const nextTab = document.getElementById(tabname);
    nextTab.hidden = false;
    void nextTab.offsetWidth;
    nextTab.classList.add("active-tab");
}

document.querySelectorAll(".tab-links[data-tab-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
        opentab(event, button.dataset.tabTarget);
    });
});


/*
------------------------------------------------------------
3. Active Navigation Highlighting
Tracks scroll position and highlights the nav link for the section currently in view.
------------------------------------------------------------
*/
const sidemenu = document.getElementById("sidemenu");
const navOpenButton = document.querySelector(".nav-open");
const navCloseButton = document.querySelector(".nav-close");
const motionToggleButtons = document.querySelectorAll(".motion-toggle");

// Mobile drawer helpers are intentionally tiny because CSS owns the animation.
function openmenu(){
    sidemenu.classList.add("is-open");
    navOpenButton?.setAttribute("aria-expanded", "true");
}
function closemenu(){
    sidemenu.classList.remove("is-open");
    navOpenButton?.setAttribute("aria-expanded", "false");
}

navOpenButton?.addEventListener("click", openmenu);
navCloseButton?.addEventListener("click", closemenu);

motionToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setReducedMotionPreference(!isReducedMotionEnabled());
    });
});

document.querySelectorAll("#sidemenu a").forEach((link) => {
    link.addEventListener("click", closemenu);
});

const navLinks = Array.from(document.querySelectorAll("#sidemenu a[href^='#']"));
const pageSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

// Highlights one nav link and clears the rest.
function setActiveNav(sectionId){
    navLinks.forEach((link) => {
        link.classList.toggle("active-nav", link.getAttribute("href") === `#${sectionId}`);
    });
}

// Chooses the active section using a checkpoint below the fixed nav, with a bottom-of-page fallback for Contact.
function updateActiveNav(){
    const navHeight = document.querySelector(".site-nav")?.offsetHeight || 0;
    const pageBottom = window.scrollY + window.innerHeight;
    const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const lastSection = pageSections[pageSections.length - 1];

    if(lastSection && pageBottom >= documentHeight - Math.max(navHeight, 24)){
        setActiveNav(lastSection.id);
        return;
    }

    const checkpoint = window.scrollY + navHeight + Math.max(90, window.innerHeight * 0.22);
    let currentSection = pageSections[0];

    pageSections.forEach((section) => {
        if(section.offsetTop <= checkpoint){
            currentSection = section;
        }
    });

    if(currentSection){
        setActiveNav(currentSection.id);
    }
}

window.addEventListener("scroll", updateActiveNav, { passive: true });
window.addEventListener("resize", updateActiveNav);
updateActiveNav();


/*
------------------------------------------------------------
4. Project Gallery Interactions
Controls project search, show-more behavior, card flipping, expansion, and search placeholder rotation.
------------------------------------------------------------
*/
const projectCards = Array.from(document.querySelectorAll(".project-card"));
const projectGrid = document.getElementById("projectGrid");
const projectSearch = document.getElementById("projectSearch");
const projectSearchLabel = projectSearch.closest(".project-search");
const projectSearchWordWindow = document.getElementById("projectSearchWordWindow");
const projectEmpty = document.getElementById("projectEmpty");
const seeMoreProjects = document.getElementById("seeMoreProjects");
let visibleProjectCount = 5;
let showAllProjects = false;

// Project titles/tags become the rotating search suggestions.
const searchWords = Array.from(new Set(
    projectCards.flatMap((card) => {
        return [card.dataset.title, card.dataset.tags]
            .join(" ")
            .split(/\s+/)
            .map((word) => word.replace(/[^a-z0-9/+.-]/gi, ""))
            .filter((word) => word.length > 2);
    })
));

// Shared rotating placeholder helper used by both Project and Journal search bars.
// It keeps one outgoing and one incoming word in the DOM so the vertical slide animation stays predictable.
function createSearchWordRotator(wordWindow, words, fallbackWord, shouldPause){
    const safeWords = words.length ? words : [fallbackWord];
    const longestWordLength = safeWords.reduce((longest, word) => Math.max(longest, word.length), fallbackWord.length);
    let wordIndex = 0;
    let activeWord = wordWindow?.querySelector(".search-word") || null;
    let cleanupTimer;

    if(wordWindow){
        wordWindow.style.setProperty("--search-word-width", `${Math.min(Math.max(longestWordLength + 1, 9), 24)}ch`);
    }

    function setStaticWord(nextWord){
        if(!wordWindow){
            return;
        }

        window.clearTimeout(cleanupTimer);
        wordWindow.innerHTML = "";
        activeWord = document.createElement("span");
        activeWord.className = "search-word is-active";
        activeWord.textContent = nextWord;
        wordWindow.append(activeWord);
    }

    return function rotateSearchWord(){
        if(!wordWindow || shouldPause()){
            return;
        }

        if(isReducedMotionEnabled()){
            setStaticWord(fallbackWord);
            return;
        }

        const nextWord = safeWords[wordIndex % safeWords.length] || fallbackWord;
        wordIndex += 1;

        if(!activeWord || !wordWindow.contains(activeWord)){
            setStaticWord(nextWord);
            return;
        }

        const existingWords = Array.from(wordWindow.querySelectorAll(".search-word"));
        if(activeWord.textContent === nextWord && existingWords.length === 1){
            return;
        }

        window.clearTimeout(cleanupTimer);
        existingWords.forEach((word) => {
            if(word !== activeWord){
                word.remove();
            }
        });

        const outgoingWord = activeWord;
        const incomingWord = document.createElement("span");
        incomingWord.className = "search-word is-entering";
        incomingWord.textContent = nextWord;
        wordWindow.append(incomingWord);
        incomingWord.getBoundingClientRect();

        outgoingWord.className = "search-word is-exiting";
        activeWord = incomingWord;

        incomingWord.classList.remove("is-entering");
        incomingWord.classList.add("is-active");

        cleanupTimer = window.setTimeout(() => {
            if(outgoingWord.parentElement === wordWindow){
                outgoingWord.remove();
            }
        }, 420);
    };
}

const updateSearchPlaceholder = createSearchWordRotator(
    projectSearchWordWindow,
    searchWords,
    "projects",
    () => !projectSearch || document.activeElement === projectSearch || Boolean(projectSearch.value)
);

// Hides the decorative prompt when a real query is present.
function updateProjectSearchState(){
    projectSearchLabel.classList.toggle("has-value", Boolean(projectSearch.value.trim()));
}

// Capture card positions before and after layout changes so filtering/show-more feels smooth.
function getVisibleProjectRects(){
    const rects = new Map();

    projectCards.forEach((card) => {
        if(card.classList.contains("is-visible")){
            rects.set(card, card.getBoundingClientRect());
        }
    });

    return rects;
}

// FLIP-style animation wrapper for project filtering, expanding, and returning cards.
// The mutator changes the DOM/classes; the wrapper animates visible cards from old positions to new ones.
function animateProjectLayout(mutator){
    if(isReducedMotionEnabled()){
        mutator();
        return;
    }

    const firstRects = getVisibleProjectRects();
    mutator();

    requestAnimationFrame(() => {
        const lastRects = getVisibleProjectRects();

        lastRects.forEach((lastRect, card) => {
            const firstRect = firstRects.get(card);

            if(!firstRect){
                card.animate([
                    { opacity: 0, transform: "translateY(18px) scale(0.98)" },
                    { opacity: 1, transform: "translateY(0) scale(1)" }
                ], {
                    duration: 420,
                    easing: "cubic-bezier(0.2, 0.7, 0.2, 1)"
                });
                return;
            }

            const deltaX = firstRect.left - lastRect.left;
            const deltaY = firstRect.top - lastRect.top;
            const scaleX = firstRect.width / lastRect.width;
            const scaleY = firstRect.height / lastRect.height;

            if(deltaX || deltaY || Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01){
                card.animate([
                    { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
                    { transform: "translate(0, 0) scale(1)" }
                ], {
                    duration: 520,
                    easing: "cubic-bezier(0.2, 0.7, 0.2, 1)"
                });
            }
        });
    });
}

// Filters project cards by search text and manages the Show More / Show Fewer project button.
function updateProjectVisibility(){
    const query = projectSearch.value.trim().toLowerCase();
    let matchingCount = 0;
    let shownCount = 0;

    projectCards.forEach((card) => {
        const searchableText = `${card.dataset.title} ${card.dataset.tags} ${card.textContent}`.toLowerCase();
        const matches = searchableText.includes(query);

        if(matches){
            matchingCount += 1;
        }

        const shouldShow = matches && (showAllProjects || query || matchingCount <= visibleProjectCount);
        card.classList.toggle("is-visible", Boolean(shouldShow));

        if(shouldShow){
            shownCount += 1;
        }
    });

    projectEmpty.classList.toggle("is-visible", matchingCount === 0);
    seeMoreProjects.hidden = Boolean(query) || matchingCount <= visibleProjectCount;
    seeMoreProjects.textContent = showAllProjects ? "Show Fewer Projects" : "Show More Projects";
}

document.querySelectorAll(".project-flip").forEach((button) => {
    button.addEventListener("click", () => {
        button.closest(".project-card").classList.add("is-flipped");
    });
});

document.querySelectorAll(".project-return").forEach((button) => {
    button.addEventListener("click", () => {
        const card = button.closest(".project-card");
        button.blur();
        animateProjectLayout(() => {
            card.classList.remove("is-flipped");
            card.classList.remove("is-expanded");
            card.classList.add("is-returning");
            card.style.setProperty("--tilt-x", "0deg");
            card.style.setProperty("--tilt-y", "0deg");
            card.style.setProperty("--glow-x", "50%");
            card.style.setProperty("--glow-y", "50%");
            const expandLabel = card.querySelector(".project-expand span");
            if(expandLabel){
                expandLabel.textContent = "Expand";
            }
        });
        setTimeout(() => {
            card.classList.remove("is-returning");
        }, 360);
    });
});

document.querySelectorAll(".project-expand").forEach((button) => {
    button.addEventListener("click", () => {
        const card = button.closest(".project-card");
        animateProjectLayout(() => {
            card.classList.toggle("is-expanded");
            button.querySelector("span").textContent = card.classList.contains("is-expanded") ? "Collapse" : "Expand";
        });
    });
});

// Creates the lightbox once in JavaScript so the HTML stays focused on page content.
function createProjectLightbox(){
    const lightbox = document.createElement("div");
    lightbox.className = "project-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Project image preview");
    lightbox.innerHTML = `
        <div class="project-lightbox-dialog">
            <div class="project-lightbox-bar">
                <button class="icon-button project-lightbox-close" type="button" aria-label="Close image preview">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="project-lightbox-stage">
                <button class="icon-button project-lightbox-nav project-lightbox-prev" type="button" aria-label="View previous project image">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <div class="project-lightbox-image-frame">
                    <img class="project-lightbox-image" alt="">
                </div>
                <button class="icon-button project-lightbox-nav project-lightbox-next" type="button" aria-label="View next project image">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <p class="project-lightbox-counter" aria-live="polite"></p>
            <p class="project-lightbox-caption"></p>
        </div>
    `;
    document.body.append(lightbox);
    return lightbox;
}

const projectLightbox = createProjectLightbox();
const projectLightboxImage = projectLightbox.querySelector(".project-lightbox-image");
const projectLightboxCaption = projectLightbox.querySelector(".project-lightbox-caption");
const projectLightboxCounter = projectLightbox.querySelector(".project-lightbox-counter");
const projectLightboxClose = projectLightbox.querySelector(".project-lightbox-close");
const projectLightboxPrev = projectLightbox.querySelector(".project-lightbox-prev");
const projectLightboxNext = projectLightbox.querySelector(".project-lightbox-next");
let projectLightboxItems = [];
let projectLightboxIndex = -1;

// Keeps disabled arrows visible for orientation while removing click/focus behavior.
function setLightboxNavState(button, isDisabled, shouldHide){
    button.hidden = shouldHide;
    button.disabled = isDisabled;
    button.setAttribute("aria-disabled", String(isDisabled));
    button.tabIndex = isDisabled ? -1 : 0;
}

// Loads the current gallery image, caption, counter, and arrow availability into the modal.
function renderProjectLightboxImage(){
    const figure = projectLightboxItems[projectLightboxIndex];
    if(!figure){
        closeProjectLightbox();
        return;
    }

    const image = figure.querySelector("img");
    const caption = figure.querySelector("figcaption")?.textContent.trim() || image.alt;

    if(!image){
        return;
    }

    projectLightboxImage.src = image.currentSrc || image.src;
    projectLightboxImage.alt = image.alt;
    projectLightboxCaption.textContent = caption;
    projectLightboxCounter.textContent = `${projectLightboxIndex + 1} / ${projectLightboxItems.length}`;

    const hasMultipleImages = projectLightboxItems.length > 1;
    setLightboxNavState(projectLightboxPrev, projectLightboxIndex <= 0, !hasMultipleImages);
    setLightboxNavState(projectLightboxNext, projectLightboxIndex >= projectLightboxItems.length - 1, !hasMultipleImages);
    projectLightbox.querySelector(".project-lightbox-stage").classList.toggle("is-single", !hasMultipleImages);
}

// Opens the lightbox from a clicked project figure and captures that figure's gallery as the slide set.
function openProjectLightbox(figure){
    const gallery = figure.closest(".project-gallery");
    projectLightboxItems = Array.from(gallery?.querySelectorAll("figure") || [figure]);
    projectLightboxIndex = Math.max(0, projectLightboxItems.indexOf(figure));

    renderProjectLightboxImage();
    projectLightbox.classList.add("is-open");
    document.body.classList.add("project-lightbox-open");
    projectLightboxClose.focus();
}

// Resets modal state so the page returns to its normal scrolling behavior.
function closeProjectLightbox(){
    projectLightbox.classList.remove("is-open");
    document.body.classList.remove("project-lightbox-open");
    projectLightboxImage.removeAttribute("src");
    projectLightboxCounter.textContent = "";
    projectLightboxItems = [];
    projectLightboxIndex = -1;
}

// Moves through the current project's gallery without wrapping past the first/last image.
function showAdjacentProjectImage(direction){
    const nextIndex = projectLightboxIndex + direction;
    if(nextIndex < 0 || nextIndex >= projectLightboxItems.length){
        return;
    }

    projectLightboxIndex = nextIndex;
    renderProjectLightboxImage();
}

// Makes project gallery figures keyboard-accessible buttons.
document.querySelectorAll(".project-gallery figure").forEach((figure) => {
    const image = figure.querySelector("img");
    if(!image){
        return;
    }

    figure.tabIndex = 0;
    figure.setAttribute("role", "button");
    figure.setAttribute("aria-label", `View ${image.alt} full screen`);
});

// Project gallery event delegation keeps every current and future figure using the same lightbox behavior.
projectGrid.addEventListener("click", (event) => {
    const figure = event.target.closest(".project-gallery figure");
    if(figure){
        openProjectLightbox(figure);
    }
});

// Keyboard support lets focused gallery figures open the same preview as mouse clicks.
projectGrid.addEventListener("keydown", (event) => {
    const figure = event.target.closest(".project-gallery figure");
    if(!figure || !["Enter", " "].includes(event.key)){
        return;
    }

    event.preventDefault();
    openProjectLightbox(figure);
});

// Lightbox click handling covers backdrop close, close button, and previous/next arrows.
projectLightbox.addEventListener("click", (event) => {
    if(event.target === projectLightbox || event.target.closest(".project-lightbox-close")){
        closeProjectLightbox();
        return;
    }

    if(event.target.closest(".project-lightbox-prev")){
        showAdjacentProjectImage(-1);
    }

    if(event.target.closest(".project-lightbox-next")){
        showAdjacentProjectImage(1);
    }
});

// Global keyboard support for closing and navigating the active lightbox.
document.addEventListener("keydown", (event) => {
    if(!projectLightbox.classList.contains("is-open")){
        return;
    }

    if(event.key === "Escape"){
        closeProjectLightbox();
    }

    if(event.key === "ArrowLeft"){
        showAdjacentProjectImage(-1);
    }

    if(event.key === "ArrowRight"){
        showAdjacentProjectImage(1);
    }
});

// Project search/show-more initialization.
seeMoreProjects.addEventListener("click", () => {
    animateProjectLayout(() => {
        showAllProjects = !showAllProjects;
        updateProjectVisibility();
    });
});

projectSearch.addEventListener("input", () => {
    updateProjectSearchState();
    animateProjectLayout(() => {
        visibleProjectCount = 5;
        showAllProjects = false;
        updateProjectVisibility();
    });
});
projectSearch.addEventListener("focus", updateProjectSearchState);
projectSearch.addEventListener("blur", updateProjectSearchState);

updateProjectSearchState();
updateProjectVisibility();
updateSearchPlaceholder();
setInterval(updateSearchPlaceholder, 1800);


/*
------------------------------------------------------------
5. Journal Data, Timeline, and Blog Cards
Stores journal entries and renders the filters, progress timeline, featured update, and blog cards.
------------------------------------------------------------
*/
const journalCategories = ["All", "Active", "Completed", "Homelab"];

// MacBook Air homelab build log. Each entry powers the timeline, feature panel, and blog cards.
// timelineOnly entries appear as planned milestones without creating clickable posts.
const journalEntries = [
    {
        id: "homelab-plan",
        title: "Homelab Plan: Repurposing a 2017 MacBook Air",
        date: "2026-07-01",
        status: "In Progress",
        state: "active",
        category: "Homelab",
        project: "MacBook Air Homelab",
        timeline: true,
        featured: true,
        likes: 0,
        contactTopic: "MacBook Air Homelab",
        tags: ["Homelab", "Windows", "Planning", "Documentation"],
        excerpt: "Starting a focused homelab project using an old MacBook Air as a practical environment for support, systems, networking, and documentation practice.",
        body: [
            "This project is focused on repurposing a 2017 MacBook Air into a practical homelab that can support local services, troubleshooting practice, firewall configuration, backups, and repeatable documentation.",
            "The goal is to treat the build like a real support project: document the baseline, track configuration changes, test access, record issues, and turn each fix into a clear note or runbook."
        ]
    },
    {
        id: "homelab-baseline-setup",
        title: "Baseline Setup and System Prep",
        date: "2026-07-06",
        status: "Planned",
        state: "planned",
        category: "Homelab",
        project: "MacBook Air Homelab",
        timeline: true,
        timelineOnly: true,
        tags: ["Windows", "Setup", "Maintenance"],
        excerpt: "Preparing the MacBook Air for homelab use by documenting the system baseline, updates, startup settings, and power configuration.",
        body: [
            "This stage will document the machine baseline, operating system state, storage considerations, update status, startup behavior, and power settings.",
            "The purpose is to create a clean starting point so future changes can be tracked clearly instead of becoming undocumented one-off fixes."
        ]
    },
    {
        id: "homelab-local-services",
        title: "Local Services: FileZilla, XAMPP, and Plex",
        date: "2026-07-11",
        status: "Planned",
        state: "planned",
        category: "Homelab",
        project: "MacBook Air Homelab",
        timeline: true,
        timelineOnly: true,
        tags: ["FileZilla", "XAMPP", "Plex", "Services"],
        excerpt: "Setting up local services to practice installation, configuration, testing, and service documentation.",
        body: [
            "This stage will focus on configuring local services such as FileZilla, XAMPP, and Plex in a controlled LAN-only environment.",
            "Each service should include setup notes, access details, troubleshooting checks, and a short explanation of what the service is used for."
        ]
    },
    {
        id: "homelab-firewall-access",
        title: "Firewall Rules and LAN-Only Access",
        date: "2026-07-16",
        status: "Planned",
        state: "planned",
        category: "Homelab",
        project: "MacBook Air Homelab",
        timeline: true,
        timelineOnly: true,
        tags: ["Firewall", "Networking", "Security"],
        excerpt: "Hardening access with Windows Firewall rules, router checks, and documentation for what should and should not be reachable.",
        body: [
            "This stage will focus on confirming that homelab services stay local to the LAN and are not unintentionally exposed to the internet.",
            "The work should include firewall rule notes, allowed/blocked access checks, router review notes, and screenshots or written evidence of the final configuration."
        ]
    },
    {
        id: "homelab-backup-restore",
        title: "Backup and Restore Spot-Checks",
        date: "2026-07-21",
        status: "Planned",
        state: "planned",
        category: "Homelab",
        project: "MacBook Air Homelab",
        timeline: true,
        timelineOnly: true,
        tags: ["Backups", "Recovery", "Runbooks"],
        excerpt: "Creating a simple backup routine and validating recovery with restore spot-checks.",
        body: [
            "This stage will document the backup approach for important configuration files, service folders, and project notes.",
            "The key goal is not just to create backups, but to validate that recovery works through small restore spot-checks and clear runbook-style documentation."
        ]
    }
];

const journalFilters = document.getElementById("journalFilters");
const journalSection = document.getElementById("journal");
const journalTimelineTrack = document.getElementById("journalTimelineTrack");
const journalTimelineLabel = document.getElementById("journalTimelineLabel");
const journalTimelineStatus = document.getElementById("journalTimelineStatus");
const journalFeature = document.getElementById("journalFeature");
const journalPostGrid = document.getElementById("journalPostGrid");
const journalSearch = document.getElementById("journalSearch");
const journalSearchLabel = journalSearch.closest(".journal-search");
const journalSearchWordWindow = document.getElementById("journalSearchWordWindow");
const journalEmpty = document.getElementById("journalEmpty");
const showMoreJournal = document.getElementById("showMoreJournal");
const journalLikeStatus = document.getElementById("journalLikeStatus");
const journalLikedStorageKey = "matthewPortfolioJournalLikes";
const journalLikeCounts = new Map(
    journalEntries
        .filter((entry) => !entry.timelineOnly)
        .map((entry) => [entry.id, Number.isFinite(Number(entry.likes)) ? Number(entry.likes) : 0])
);
let selectedJournalCategory = "All";
let visibleJournalCount = 3;
let showAllJournal = false;
let journalTimelineLightTimer;
let likedJournalPosts = readLikedJournalPosts();

// Journal titles, tags, statuses, and project names become the rotating search suggestions.
const journalSearchWords = Array.from(new Set(
    journalEntries.flatMap((entry) => {
        return [
            entry.title,
            entry.project,
            entry.category,
            entry.status,
            entry.tags.join(" ")
        ].join(" ")
            .split(/\s+/)
            .map((word) => word.replace(/[^a-z0-9/+.-]/gi, ""))
            .filter((word) => word.length > 2);
    })
));

const updateJournalSearchPlaceholder = createSearchWordRotator(
    journalSearchWordWindow,
    journalSearchWords,
    "homelab",
    () => !journalSearch || document.activeElement === journalSearch || Boolean(journalSearch.value)
);

// Escapes dynamic strings before template rendering to keep generated HTML safe.
function escapeHtml(value){
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Displays stored ISO dates in a reader-friendly format.
function formatJournalDate(dateString){
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

// Converts statuses into class-name fragments such as "in-progress".
function slugifyStatus(status){
    return status.toLowerCase().replace(/\s+/g, "-");
}

// Keeps pill groups compact by rendering only the first few tags.
function renderTagPills(tags, limit = 3){
    return tags.slice(0, limit).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

// Reads the browser/device-level liked-post list; backend counts remain the source for shared totals.
function readLikedJournalPosts(){
    try{
        const storedLikes = JSON.parse(window.localStorage.getItem(journalLikedStorageKey) || "[]");
        return new Set(Array.isArray(storedLikes) ? storedLikes : []);
    }catch(error){
        return new Set();
    }
}

// Saves the liked-post list so this browser/device cannot increment the same Journal post repeatedly.
function saveLikedJournalPosts(){
    try{
        window.localStorage.setItem(journalLikedStorageKey, JSON.stringify(Array.from(likedJournalPosts)));
    }catch(error){
        // Likes still work for the current page load if storage is unavailable.
    }
}

function getJournalLikeCount(postId){
    return journalLikeCounts.get(postId) || 0;
}

function announceJournalLikeStatus(message){
    if(journalLikeStatus){
        journalLikeStatus.textContent = message;
    }
}

// Apps Script responses may name the updated count in slightly different ways; this keeps the front end tolerant.
function extractJournalLikeCount(response, postId){
    const possibleCount = response?.count ?? response?.likes ?? response?.likeCount ?? response?.like_count;

    if(typeof possibleCount === "number"){
        return possibleCount;
    }

    if(typeof possibleCount === "string" && possibleCount.trim() !== ""){
        const parsedCount = Number(possibleCount);
        return Number.isFinite(parsedCount) ? parsedCount : null;
    }

    if(response?.likes && typeof response.likes === "object"){
        const postCount = response.likes[postId];
        const parsedPostCount = Number(postCount);
        return Number.isFinite(parsedPostCount) ? parsedPostCount : null;
    }

    return null;
}

function updateJournalLikeButtons(postId){
    document.querySelectorAll(".journal-like-button").forEach((button) => {
        if(button.dataset.journalLike !== postId){
            return;
        }

        const entryTitle = button.dataset.journalTitle || "this Journal post";
        const likeCount = getJournalLikeCount(postId);
        const isLiked = likedJournalPosts.has(postId);
        button.classList.toggle("is-liked", isLiked);
        button.setAttribute("aria-pressed", String(isLiked));
        button.setAttribute("aria-disabled", "false");
        button.setAttribute("aria-label", `${isLiked ? "Unlike" : "Like"} ${entryTitle}. ${likeCount} like${likeCount === 1 ? "" : "s"}.`);
        button.querySelector(".journal-like-label").textContent = isLiked ? "Unlike" : "Like";
        button.querySelector(".journal-like-count").textContent = likeCount;
    });
}

function updateAllJournalLikeButtons(){
    journalLikeCounts.forEach((count, postId) => updateJournalLikeButtons(postId));
}

function renderJournalActions(entry){
    const postId = escapeHtml(entry.id);
    const title = escapeHtml(entry.title);
    const isLiked = likedJournalPosts.has(entry.id);
    const likeCount = getJournalLikeCount(entry.id);
    const githubLink = entry.githubUrl ? `
        <a class="journal-action" href="${escapeHtml(entry.githubUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open GitHub repository for ${title}">
            <i class="fa-brands fa-github"></i>
            <span>GitHub</span>
        </a>
    ` : "";

    return `
        <div class="journal-actions" aria-label="Journal actions">
            <button class="journal-action journal-like-button${isLiked ? " is-liked" : ""}" type="button" data-journal-like="${postId}" data-journal-title="${title}" aria-pressed="${String(isLiked)}" aria-disabled="false" aria-label="${isLiked ? "Unlike" : "Like"} ${title}. ${likeCount} like${likeCount === 1 ? "" : "s"}.">
                <i class="fa-solid fa-heart"></i>
                <span class="journal-like-label">${isLiked ? "Unlike" : "Like"}</span>
                <span class="journal-like-count">${likeCount}</span>
            </button>
            <a class="journal-action" href="#contact" aria-label="Ask about ${escapeHtml(entry.contactTopic || entry.title)}">
                <i class="fa-solid fa-envelope"></i>
                <span>Ask About It</span>
            </a>
            ${githubLink}
        </div>
    `;
}

async function loadJournalLikes(){
    try{
        const likesUrl = new URL(PORTFOLIO_BACKEND_URL);
        likesUrl.searchParams.set("action", "getAllLikes");
        const response = await fetch(likesUrl.toString());
        const result = await response.json();

        if(!response.ok || result.result === "error" || !result.likes || typeof result.likes !== "object"){
            throw new Error(result.error || "Unable to load Journal likes.");
        }

        Object.entries(result.likes).forEach(([postId, count]) => {
            const parsedCount = Number(count);
            if(Number.isFinite(parsedCount)){
                journalLikeCounts.set(postId, parsedCount);
            }
        });
        updateAllJournalLikeButtons();
    }catch(error){
        console.warn("Journal likes could not be loaded:", error);
    }
}

async function toggleJournalLike(postId){
    if(!postId){
        return;
    }

    const wasLiked = likedJournalPosts.has(postId);
    const nextLikedState = !wasLiked;
    const previousCount = getJournalLikeCount(postId);
    const optimisticCount = Math.max(0, previousCount + (nextLikedState ? 1 : -1));
    const buttons = Array.from(document.querySelectorAll(".journal-like-button"))
        .filter((button) => button.dataset.journalLike === postId);

    if(nextLikedState){
        likedJournalPosts.add(postId);
    }else{
        likedJournalPosts.delete(postId);
    }

    saveLikedJournalPosts();
    journalLikeCounts.set(postId, optimisticCount);
    buttons.forEach((button) => {
        button.disabled = true;
        button.classList.add("is-loading");
    });
    updateJournalLikeButtons(postId);

    try{
        const formData = new FormData();
        formData.set("action", nextLikedState ? "like" : "unlike");
        formData.set("post_id", postId);

        const response = await fetch(PORTFOLIO_BACKEND_URL, {
            method: "POST",
            body: formData
        });
        const result = await response.json();

        if(!response.ok || result.result === "error"){
            throw new Error(result.error || `Unable to ${nextLikedState ? "like" : "unlike"} Journal post.`);
        }

        const updatedCount = extractJournalLikeCount(result, postId);
        if(updatedCount !== null){
            /*
                The original backend supports liking, but older deployments may not
                decrement on unlike yet. For unlikes, keep the local decremented
                number unless the backend returns a count that is also decremented.
            */
            if(nextLikedState || updatedCount <= optimisticCount){
                journalLikeCounts.set(postId, updatedCount);
            }else{
                journalLikeCounts.set(postId, optimisticCount);
            }
        }
        updateJournalLikeButtons(postId);
        announceJournalLikeStatus(`${nextLikedState ? "Liked" : "Unliked"} Journal post. ${getJournalLikeCount(postId)} like${getJournalLikeCount(postId) === 1 ? "" : "s"}.`);
    }catch(error){
        if(nextLikedState){
            likedJournalPosts.delete(postId);
            saveLikedJournalPosts();
            journalLikeCounts.set(postId, previousCount);
            updateJournalLikeButtons(postId);
            announceJournalLikeStatus("Like failed. Please try again.");
            console.error("Journal like error:", error);
        }else{
            updateJournalLikeButtons(postId);
            announceJournalLikeStatus("Unliked on this browser.");
            console.warn("Journal unlike could not be synced with the backend:", error);
        }
    }finally{
        buttons.forEach((button) => {
            button.disabled = false;
            button.classList.remove("is-loading");
        });
        updateJournalLikeButtons(postId);
    }
}

// Hides the decorative prompt when a real Journal query is present.
function updateJournalSearchState(){
    journalSearchLabel.classList.toggle("has-value", Boolean(journalSearch.value.trim()));
}

// Category filters include special tabs plus matching against project/tag names.
function matchesJournalCategory(entry, category){
    if(category === "All"){
        return true;
    }
    if(category === "Active"){
        return entry.status === "In Progress";
    }
    if(category === "Completed"){
        return entry.status === "Completed";
    }
    return entry.category === category || entry.tags.includes(category);
}

// Search checks all visible user-facing fields from each Journal entry.
function matchesJournalSearch(entry, query){
    if(!query){
        return true;
    }

    const searchableText = [
        entry.title,
        entry.date,
        entry.status,
        entry.category,
        entry.project,
        entry.excerpt,
        entry.tags.join(" "),
        entry.body.join(" ")
    ].join(" ").toLowerCase();

    return searchableText.includes(query);
}

// Applies the active category and search query to the full Journal data set.
function getFilteredJournalEntries(){
    const query = journalSearch.value.trim().toLowerCase();
    return journalEntries.filter((entry) => {
        return matchesJournalCategory(entry, selectedJournalCategory) && matchesJournalSearch(entry, query);
    });
}

// Rebuilds the filter buttons so the active state always matches selectedJournalCategory.
function renderJournalFilters(){
    journalFilters.hidden = false;
    journalFilters.innerHTML = journalCategories.map((category) => {
        const isSelected = category === selectedJournalCategory;
        return `<button class="journal-filter${isSelected ? " is-active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
    }).join("");
}

// Finds how far the timeline should light up based on the latest completed/active milestone.
function getTimelineProgressState(nodes){
    if(!nodes.length){
        return {
            progress: 0,
            latestCompleteIndex: -1
        };
    }

    const latestCompleteIndex = nodes.reduce((highestIndex, entry, index) => {
        return ["completed", "milestone", "active"].includes(entry.state) ? index : highestIndex;
    }, -1);

    if(latestCompleteIndex < 0 || nodes.length === 1){
        return {
            progress: 0,
            latestCompleteIndex
        };
    }

    return {
        progress: Math.max(0, Math.min(100, (latestCompleteIndex / (nodes.length - 1)) * 100)),
        latestCompleteIndex
    };
}

// Places one milestone at the start, two at both ends, and three or more evenly across the full track.
function getTimelineNodePosition(index, total){
    if(total <= 1){
        return 0;
    }

    return index / (total - 1);
}

// Converts a normalized 0-1 position into a CSS left value that respects the track's inset padding.
function getTimelineNodeLeft(position){
    const trackInset = 64;
    const offset = trackInset - (trackInset * 2 * position);
    return `calc(${(position * 100).toFixed(4)}% + ${offset.toFixed(2)}px)`;
}

// Resets the progress light before replaying it, so switching tabs always animates from zero.
function queueJournalTimelineLightUp(){
    window.clearTimeout(journalTimelineLightTimer);
    journalTimelineTrack.classList.add("is-resetting");
    journalTimelineTrack.classList.remove("is-illuminated");
    void journalTimelineTrack.offsetWidth;

    if(isReducedMotionEnabled()){
        journalTimelineTrack.classList.remove("is-resetting");
        journalTimelineTrack.classList.add("is-illuminated");
        return;
    }

    journalTimelineLightTimer = window.setTimeout(() => {
        journalTimelineTrack.classList.remove("is-resetting");
        requestAnimationFrame(() => {
            journalTimelineTrack.classList.add("is-illuminated");
        });
    }, 80);
}

// Build the horizontal progress timeline for the currently selected Journal view.
function renderJournalTimeline(entries){
    const timelineNodes = entries
        .filter((entry) => entry.timeline)
        .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));
    const timelineProgress = getTimelineProgressState(timelineNodes);

    journalTimelineLabel.textContent = selectedJournalCategory;
    journalTimelineStatus.textContent = `${timelineNodes.length} project milestone${timelineNodes.length === 1 ? "" : "s"}`;
    journalTimelineTrack.classList.remove("is-illuminated");
    journalTimelineTrack.dataset.count = timelineNodes.length;
    journalTimelineTrack.style.setProperty("--journal-progress", `${timelineProgress.progress}%`);
    journalTimelineTrack.style.setProperty("--journal-progress-scale", `${timelineProgress.progress / 100}`);
    journalTimelineTrack.style.setProperty("--journal-node-count", Math.max(timelineNodes.length, 1));

    if(!timelineNodes.length){
        journalTimelineTrack.innerHTML = '<p class="journal-timeline-empty">No timeline milestones match this view yet.</p>';
        return;
    }

    journalTimelineTrack.innerHTML = timelineNodes.map((entry, index) => {
        const position = getTimelineNodePosition(index, timelineNodes.length);
        const hasJournalPost = !entry.timelineOnly;
        // Planned timeline-only milestones stay visible but are rendered as non-clickable nodes.
        const nodeClasses = [
            "journal-node",
            hasJournalPost ? "has-post" : "is-noninteractive",
            `is-${entry.state}`,
            index === 0 ? "is-first" : "",
            timelineNodes.length === 1 ? "is-only" : "",
            timelineNodes.length > 1 && index === timelineNodes.length - 1 ? "is-last" : "",
            index > 0 && index < timelineNodes.length - 1 ? "is-middle" : "",
            index <= timelineProgress.latestCompleteIndex ? "is-lit" : "",
            index === timelineProgress.latestCompleteIndex ? "is-progress-edge" : ""
        ].filter(Boolean).join(" ");

        const nodeContent = `
                <span class="journal-node-dot">
                    <i class="fa-solid ${entry.state === "planned" ? "fa-clock" : "fa-check"} node-state-icon"></i>
                    <i class="fa-solid fa-arrow-right node-arrow-icon"></i>
                    <span>${hasJournalPost ? "View Post" : "Planned"}</span>
                </span>
                <span class="journal-node-copy">
                    <strong>${escapeHtml(entry.title)}</strong>
                    <small>${escapeHtml(entry.status)} - ${escapeHtml(formatJournalDate(entry.date))}</small>
                </span>
        `;

        if(hasJournalPost){
            return `
            <button class="${escapeHtml(nodeClasses)}" style="--journal-node-left: ${escapeHtml(getTimelineNodeLeft(position))}; --journal-node-delay: ${(index * 0.12).toFixed(2)}s;" type="button" data-journal-target="${escapeHtml(entry.id)}" aria-label="Read ${escapeHtml(entry.title)}">
                ${nodeContent}
            </button>
            `;
        }

        return `
            <div class="${escapeHtml(nodeClasses)}" style="--journal-node-left: ${escapeHtml(getTimelineNodeLeft(position))}; --journal-node-delay: ${(index * 0.12).toFixed(2)}s;" aria-label="${escapeHtml(entry.title)} - post coming soon">
                ${nodeContent}
            </div>
        `;
    }).join("");
}

// Show the featured Journal update, or a friendly empty panel when no entry matches.
function renderJournalFeature(entries){
    const postEntries = entries.filter((entry) => !entry.timelineOnly);
    const featuredEntry = postEntries.find((entry) => entry.featured) || postEntries[0];

    if(!featuredEntry){
        journalFeature.hidden = false;
        journalFeature.innerHTML = `
            <div class="journal-feature-empty">
                <h2>No featured milestone matches this view.</h2>
                <p>Try a different Journal tab or clear the search to bring a milestone update back into focus.</p>
            </div>
        `;
        return;
    }

    journalFeature.hidden = false;
    journalFeature.innerHTML = `
        <div class="journal-feature-copy">
            <span class="status-pill status-${escapeHtml(slugifyStatus(featuredEntry.status))}">${escapeHtml(featuredEntry.status)}</span>
            <h2>${escapeHtml(featuredEntry.title)}</h2>
            <p>${escapeHtml(featuredEntry.excerpt)}</p>
            <div class="journal-meta-line">
                <span>${escapeHtml(formatJournalDate(featuredEntry.date))}</span>
                <span>${escapeHtml(featuredEntry.project)}</span>
                <span>${escapeHtml(featuredEntry.category)}</span>
            </div>
        </div>
        <div class="journal-feature-actions">
            <div class="journal-tags">${renderTagPills(featuredEntry.tags)}</div>
            <button class="journal-flip journal-read-feature" type="button" data-journal-target="${escapeHtml(featuredEntry.id)}">
                <i class="fa-solid fa-arrow-right"></i>
                <span>Read Update</span>
            </button>
        </div>
    `;
}

// Render the front/back Journal cards and keep the Show More button in sync.
function renderJournalCards(entries){
    const postEntries = entries.filter((entry) => !entry.timelineOnly);
    const visibleEntries = showAllJournal ? postEntries : postEntries.slice(0, visibleJournalCount);
    journalEmpty.classList.toggle("is-visible", postEntries.length === 0);
    showMoreJournal.hidden = postEntries.length <= visibleJournalCount;
    showMoreJournal.textContent = showAllJournal ? "Show Fewer Blog Posts" : "Show More Blog Posts";

    journalPostGrid.innerHTML = visibleEntries.map((entry) => {
        const tags = renderTagPills(entry.tags);
        const actions = renderJournalActions(entry);
        const body = entry.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");

        return `
            <article class="journal-card tilt-card" id="journal-post-${escapeHtml(entry.id)}">
                <div class="journal-card-inner">
                    <div class="journal-face journal-front">
                        <div class="journal-card-meta">
                            <span class="status-pill status-${escapeHtml(slugifyStatus(entry.status))}">${escapeHtml(entry.status)}</span>
                            <time datetime="${escapeHtml(entry.date)}">${escapeHtml(formatJournalDate(entry.date))}</time>
                        </div>
                        <h3>${escapeHtml(entry.title)}</h3>
                        <div class="journal-context">
                            <span>${escapeHtml(entry.project)}</span>
                            <span>${escapeHtml(entry.category)}</span>
                        </div>
                        <p>${escapeHtml(entry.excerpt)}</p>
                        <div class="journal-tags">${tags}</div>
                        ${actions}
                        <button class="journal-flip" type="button" aria-label="Read ${escapeHtml(entry.title)}">
                            <i class="fa-solid fa-arrow-right"></i>
                            <span>Read Update</span>
                        </button>
                    </div>
                    <div class="journal-face journal-back">
                        <button class="journal-expand" type="button">
                            <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                            <span>Expand</span>
                        </button>
                        <div class="journal-detail-scroll">
                            <span class="status-pill status-${escapeHtml(slugifyStatus(entry.status))}">${escapeHtml(entry.status)}</span>
                            <h3>${escapeHtml(entry.title)}</h3>
                            <div class="journal-meta-line">
                                <span>${escapeHtml(formatJournalDate(entry.date))}</span>
                                <span>${escapeHtml(entry.project)}</span>
                                <span>${escapeHtml(entry.category)}</span>
                            </div>
                            <div class="journal-entry-body">${body}</div>
                        </div>
                        <div class="journal-back-footer">
                            <div class="journal-tags">${renderTagPills(entry.tags)}</div>
                            ${actions}
                        </div>
                        <button class="icon-button journal-return" type="button" aria-label="Return to ${escapeHtml(entry.title)} preview">
                            <i class="fa-solid fa-arrow-left"></i>
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

// Coordinates the Journal render pipeline whenever filters, search, or show-more state changes.
function renderJournal(){
    const entries = getFilteredJournalEntries();
    renderJournalFilters();
    renderJournalTimeline(entries);
    renderJournalFeature(entries);
    renderJournalCards(entries);
    queueJournalTimelineLightUp();
}

// Used by timeline nodes, featured updates, and project links to open the related Journal card.
function scrollToJournalEntry(entryId){
    let card = document.getElementById(`journal-post-${entryId}`);
    if(!card){
        const entryExists = getFilteredJournalEntries().some((entry) => entry.id === entryId);
        if(entryExists && !showAllJournal){
            showAllJournal = true;
            renderJournal();
            requestAnimationFrame(() => scrollToJournalEntry(entryId));
        }
        return;
    }

    card.scrollIntoView({ behavior: isReducedMotionEnabled() ? "auto" : "smooth", block: "center" });
    card.classList.add("is-highlighted");
    const readButton = card.querySelector(".journal-flip");
    if(readButton){
        readButton.classList.add("is-peeking");
    }
    setTimeout(() => {
        card.classList.remove("is-highlighted");
        if(readButton){
            readButton.classList.remove("is-peeking");
        }
    }, 1400);
}

// Journal controls: filters, timeline nodes, feature buttons, and cards all re-render from the same data source.
journalFilters.addEventListener("click", (event) => {
    const filterButton = event.target.closest(".journal-filter");
    if(!filterButton){
        return;
    }

    selectedJournalCategory = filterButton.dataset.category;
    showAllJournal = false;
    renderJournal();
});

// Only timeline nodes with data-journal-target are clickable; planned nodes are left non-interactive.
journalTimelineTrack.addEventListener("click", (event) => {
    const node = event.target.closest("[data-journal-target]");
    if(node){
        scrollToJournalEntry(node.dataset.journalTarget);
    }
});

// Featured Journal CTA uses the same scroll/open helper as timeline nodes.
journalFeature.addEventListener("click", (event) => {
    const target = event.target.closest("[data-journal-target]");
    if(target){
        scrollToJournalEntry(target.dataset.journalTarget);
    }
});

// Project cards can deep-link into Journal entries when a project action provides a matching data attribute.
document.addEventListener("click", (event) => {
    const projectJournalLink = event.target.closest(".project-actions a[data-journal-target]");
    if(!projectJournalLink){
        return;
    }

    event.preventDefault();
    scrollToJournalEntry(projectJournalLink.dataset.journalTarget);
});

// Blog cards share one delegated listener for read, back, and expand controls.
journalPostGrid.addEventListener("click", (event) => {
    const likeButton = event.target.closest(".journal-like-button");
    const flipButton = event.target.closest(".journal-flip");
    const returnButton = event.target.closest(".journal-return");
    const expandButton = event.target.closest(".journal-expand");

    if(likeButton){
        if(likeButton.disabled){
            return;
        }

        toggleJournalLike(likeButton.dataset.journalLike);
        return;
    }

    if(flipButton){
        flipButton.closest(".journal-card").classList.add("is-flipped");
    }

    if(returnButton){
        const card = returnButton.closest(".journal-card");
        card.classList.remove("is-flipped", "is-expanded");
        const expandLabel = card.querySelector(".journal-expand span");
        if(expandLabel){
            expandLabel.textContent = "Expand";
        }
    }

    if(expandButton){
        const card = expandButton.closest(".journal-card");
        card.classList.toggle("is-expanded");
        expandButton.querySelector("span").textContent = card.classList.contains("is-expanded") ? "Collapse" : "Expand";
    }
});

// Journal search/show-more initialization.
showMoreJournal.addEventListener("click", () => {
    showAllJournal = !showAllJournal;
    renderJournal();
});

journalSearch.addEventListener("input", () => {
    updateJournalSearchState();
    showAllJournal = false;
    renderJournal();
});
journalSearch.addEventListener("focus", updateJournalSearchState);
journalSearch.addEventListener("blur", updateJournalSearchState);

updateJournalSearchState();
updateJournalSearchPlaceholder();
setInterval(updateJournalSearchPlaceholder, 1800);
renderJournal();
loadJournalLikes();

// Replays the timeline light-up when the Journal section enters view.
if("IntersectionObserver" in window && journalSection){
    const journalTimelineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if(entry.isIntersecting){
                queueJournalTimelineLightUp();
            }
        });
    }, {
        threshold: 0.34
    });

    journalTimelineObserver.observe(journalSection);
}else{
    window.addEventListener("scroll", () => {
        const rect = journalSection.getBoundingClientRect();
        if(rect.top < window.innerHeight * 0.72 && rect.bottom > window.innerHeight * 0.18){
            queueJournalTimelineLightUp();
        }
    }, { passive: true });
}

// Optional global hook for inline links or future project actions that need to open a Journal post.
window.showJournalPost = scrollToJournalEntry;


/*
------------------------------------------------------------
6. Cursor Tilt Effect
Applies the subtle cursor-following tilt used by focus, project, and journal cards.
------------------------------------------------------------
*/
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if(canHover){
    // Resets the CSS variables used by the tilt/glow effect.
    function resetTiltCard(card){
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
        card.style.setProperty("--glow-x", "50%");
        card.style.setProperty("--glow-y", "50%");
    }

    // Cursor position is translated into small rotate values and a moving glow hotspot.
    document.addEventListener("pointermove", (event) => {
        const card = event.target.closest(".tilt-card");
        if(!card){
            return;
        }

        if(isReducedMotionEnabled()){
            resetTiltCard(card);
            return;
        }

        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        card.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
        card.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(0)}%`);
        card.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(0)}%`);
    });

    // Leaving a card restores it to a neutral, non-tilted state.
    document.addEventListener("pointerout", (event) => {
        const card = event.target.closest(".tilt-card");
        if(card && !card.contains(event.relatedTarget)){
            resetTiltCard(card);
        }
    });
}


/*
------------------------------------------------------------
7. Contact Form Submission
Validates the contact form, posts FormData to Google Apps Script, and reports sending, success, or failure states.
------------------------------------------------------------
*/
const scriptURL = PORTFOLIO_BACKEND_URL
const form = document.forms['submit-to-google-sheet']
const msg = document.getElementById("msg")
const honeypotField = form?.elements['mobile_number']
const submitButton = form?.querySelector('button[type="submit"]')
const originalSubmitText = submitButton?.textContent || "Submit"
const contactNamePattern = /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF' .-]{2,50}$/
let contactStatusTimer

function clearContactStatus(){
    if(!msg){
        return
    }

    msg.textContent = ""
    msg.classList.remove("is-sending", "is-success", "is-error")
}

function showContactStatus(message, state, clearDelay = 0){
    if(!msg){
        return
    }

    window.clearTimeout(contactStatusTimer)
    clearContactStatus()
    msg.textContent = message

    if(state){
        msg.classList.add(`is-${state}`)
    }

    if(clearDelay){
        contactStatusTimer = window.setTimeout(clearContactStatus, clearDelay)
    }
}

function setContactSending(isSending){
    if(!submitButton){
        return
    }

    submitButton.disabled = isSending
    submitButton.textContent = isSending ? "Sending..." : originalSubmitText
}

function resetContactValidity(){
    form.elements['name']?.setCustomValidity("")
    form.elements['email']?.setCustomValidity("")
    form.elements['message']?.setCustomValidity("")
}

function validateContactForm(){
    const nameField = form.elements['name']
    const emailField = form.elements['email']
    const messageField = form.elements['message']

    resetContactValidity()

    const nameValue = nameField.value.trim()
    const emailValue = emailField.value.trim()
    const messageValue = messageField.value.trim()

    nameField.value = nameValue
    emailField.value = emailValue
    messageField.value = messageValue

    if(!contactNamePattern.test(nameValue)){
        nameField.setCustomValidity("Please enter a valid name using letters, spaces, apostrophes, hyphens, or periods only.")
    }

    if(messageValue.length < 10 || messageValue.length > 1000){
        messageField.setCustomValidity("Please enter a message between 10 and 1000 characters.")
    }

    if(!form.reportValidity()){
        showContactStatus("Please fix the highlighted fields.", "error", 7000)
        return false
    }

    return true
}

if(form){
    form.addEventListener("input", event => {
        if(event.target.matches('input[name="name"], input[name="email"], textarea[name="message"]')){
            event.target.setCustomValidity("")
        }
    })

    // Prevents a page refresh, sends the form data, then clears the form after a confirmed successful response.
    form.addEventListener('submit', async e => {
        e.preventDefault()

        if(honeypotField?.value.trim()){
            return
        }

        if(!validateContactForm()){
            return
        }

        showContactStatus("Sending message...", "sending")
        setContactSending(true)

        try{
            const formData = new FormData(form)
            formData.set("action", "contact")
            const response = await fetch(scriptURL, { method: 'POST', body: formData })
            const result = await response.json()

            if(!response.ok || result.result !== "success"){
                throw new Error(result.error || `Form submission failed with status ${response.status}.`)
            }

            form.reset()
            resetContactValidity()
            showContactStatus("Message sent successfully!", "success", 5000)
        }catch(error){
            showContactStatus("Message failed to send. Please try again.", "error", 8000)
            console.error('Contact form error:', error)
        }finally{
            setContactSending(false)
        }
    })
}
