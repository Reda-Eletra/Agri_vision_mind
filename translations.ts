
export const translations = {
    en: {
        app: {
            title: 'Agricultural Vision Mind',
            login: 'Login',
            logout: 'Logout',
            signUp: 'Sign Up',
            buttons: {
                doctor: 'Plant Doctor',
                guide: 'Growth Guide',
                dashboard: 'Dashboard',
                library: 'Disease Library',
                community: 'Community',
                contact: 'Contact',
                home: 'Home'
            },
            openChat: 'Open Chat'
        },
        modals: {
            profile: {
                title: 'Profile Settings',
                name: 'Name',
                email: 'Email',
                password: 'Password',
                loginTab: 'Login',
                signupTab: 'Sign Up',
                save: 'Save Changes',
                cancel: 'Cancel',
                userNotFound: 'User not found',
                emailExists: 'Email already exists',
                loginWithGoogle: 'Continue with Google',
                loginWithMicrosoft: 'Continue with Microsoft',
                loginWithYahoo: 'Continue with Yahoo',
                or: 'OR',
                noAccount: "Don't have an account?",
                hasAccount: "Already have an account?",
                aiModel: 'AI Model',
                checkForUpdates: 'Check for Updates',
                checking: 'Checking...',
                upToDate: 'Model is up to date',
                updated: 'Model updated to {{version}}!',
                changePicture: 'Change Picture'
            },
            farm: {
                addTitle: 'Add New Farm',
                editTitle: 'Edit Farm',
                cropName: 'Crop Name',
                cropPlaceholder: 'e.g. Corn',
                area: 'Area',
                unit: 'Unit',
                acres: 'Acres',
                hectares: 'Hectares',
                soilType: 'Soil Type',
                plantingDate: 'Planting Date',
                growingSeason: 'Growing Season',
                seasonPlaceholder: 'e.g. Spring 2024',
                photo: 'Farm Photo',
                save: 'Save Farm',
                saving: 'Saving...',
                cancel: 'Cancel',
                delete: 'Delete Farm',
                validationError: 'Please fill in all required fields',
                deleteConfirmTitle: 'Delete this farm?',
                deleteConfirmDesc: 'All farm data will be permanently removed. This cannot be undone.',
                deleteConfirm: 'Yes, Delete',
                deleteCancel: 'Keep Farm',
            },
            trackedPlant: {
                title: 'Tracking: {{name}}',
                addLogPrompt: 'It has been over a week since your last checkup. Add a new log to update progress.',
                initialDiagnosis: 'Initial Diagnosis',
                symptoms: 'Symptoms',
                treatment: 'Treatment',
                progressTimeline: 'Progress Timeline',
                noLogs: 'No progress logs yet.',
                addLogTitle: 'Add Progress Log',
                addPhoto: 'Add Current Photo',
                notesPlaceholder: 'Add notes about current condition...',
                analyzeAndLog: 'Analyze & Log Progress',
                analyzing: 'Analyzing...',
                saving: 'Saving...',
                deleteTracking: 'Stop Tracking',
                close: 'Close',
                photoRequired: 'Please upload a photo for analysis.',
                urlError: 'Cannot analyze initial image (external URL). Please upload a new photo.',
                aiAnalysis: 'AI Analysis'
            }
        },
        dashboard: {
            hello: 'Hello, {{name}}',
            pageSubtitle: 'Your agricultural command center',
            crowdAlert: 'Regional Alert',
            crowdAlertText: 'High risk of {{disease}} reported in your area.',
            stats: {
                diagnosesThisMonth: 'Diagnoses (Mo)',
                healthScore: 'Avg Health Score',
                plantedPlants: 'Tracked Plants',
                activeFarms: 'Active Farms'
            },
            sidebar: {
                title: 'Smart Assistant',
                welcome: 'Welcome, {{name}}',
                notifications: 'Notifications',
                checkupAlert: '{{plant}} needs a checkup.',
                checkupAction: 'Check Now',
                weatherAlert: 'Heavy rain expected tomorrow.',
                overview: 'Overview',
                myFarms: 'My Farms',
                satellite: 'Satellite',
                tracking: 'Tracking',
                analytics: 'Analytics',
                finance: 'Finance',
                store: 'Agricultural Store',
                forecasts: 'Forecasts',
                alerts: 'Alerts',
                settings: 'Settings'
            },
            finance: {
                title: 'Financial Overview',
                subtitle: 'Track income, expenses, and AI insights.',
                addTransaction: 'New Transaction',
                income: 'Total Income',
                expenses: 'Total Expenses',
                netProfit: 'Net Profit',
                aiAnalysis: 'AI Financial Analysis',
                analyzing: 'Analyzing financial health...',
                transactionHistory: 'Transaction History',
                noTransactions: 'No transactions recorded yet.',
                modal: {
                    title: 'New Transaction',
                    type: 'Type',
                    incomeType: 'Income',
                    expenseType: 'Expense',
                    amount: 'Amount',
                    date: 'Date',
                    category: 'Category',
                    description: 'Description',
                    farm: 'Farm (Optional)',
                    save: 'Save Transaction'
                },
                categories: {
                    Seeds: 'Seeds',
                    Fertilizers: 'Fertilizers',
                    Labor: 'Labor',
                    Fuel: 'Fuel',
                    Equipment: 'Equipment',
                    Sale: 'Sale',
                    Other: 'Other'
                }
            },
            predictive: {
                title: 'Disease Forecast',
                risk: 'Risk',
                noRisks: 'No high-risk diseases predicted for your crops based on current weather.',
                crop: 'Affected Crop',
                action: 'Preventive Action'
            },
            productivityChart: {
                title: 'Productivity Trend'
            },
            performanceAnalytics: {
                title: 'Performance Analytics',
                noData: 'No farm data available for analytics.',
                error: 'Failed to load analytics.',
                kpi: {
                    averageYield: 'Average Yield',
                    bestCrop: 'Best Crop',
                    bestSoil: 'Best Soil',
                    totalFarms: 'Total Farms'
                },
                cropPerformanceTitle: 'Crop Performance',
                tableHeaders: {
                    crop: 'Crop',
                    avgYield: 'Avg Yield',
                    totalArea: 'Total Area'
                },
                insightsTitle: 'AI Insights',
                yieldPrediction: 'Yield Prediction'
            },
            myFarms: 'My Farms',
            noFarms: 'No Farms Added',
            noFarmsSub: 'Start by adding your first farm to track crops and soil.',
            addFarm: 'Add Farm',
            smartSchedule: 'Smart Schedule',
            weatherDelay: 'Delayed due to rain',
            tracking: {
                title: 'Tracked Plants',
                subtitle: 'Monitor recovery and growth of your diagnosed plants.',
                noPlants: 'No Plants Tracked',
                noPlantsSub: 'Diagnose a plant and choose "Track" to see it here.',
            },
            viewReport: 'View Report',
            geoAgri: {
                title: 'Geo-Agri Analysis',
                subtitle: 'AI insights based on your location',
                loading: 'Analyzing local soil and climate data...',
                error: 'Could not load location data.',
                soilType: 'Soil Type',
                suitableCrops: 'Suitable Crops',
                diseaseRisks: 'Disease Risks',
                climate: 'Climate Summary'
            },
            satellite: {
                title: 'Satellite & NDVI Monitor',
                subtitle: 'Monitor vegetation health from space using your farm polygons.',
                selectFarm: 'Select Farm',
                refresh: 'Refresh',
                loading: 'Fetching latest satellite imagery...',
                error: 'Could not load satellite data.',
                noFarmsTitle: 'No Farm Boundaries Found',
                noFarmsSub: 'Draw a farm polygon first from My Farms > Edit/Add Farm > Map Draw.',
                ndviScore: 'NDVI Mean',
                healthStatus: 'Vegetation Health',
                capturedAt: 'Captured On',
                source: 'Satellite Source',
                cloudCoverage: 'Cloud Coverage',
                pixelCount: 'Analyzed Pixels',
                range: 'Range',
                ndviHeatmap: 'NDVI Heatmap',
                trueColor: 'True Color Image',
                imageError: 'Image could not be displayed. Try refreshing.',
                legend: 'NDVI Threshold Guide',
                status: {
                    critical: 'Critical',
                    poor: 'Poor',
                    moderate: 'Moderate',
                    good: 'Good',
                    excellent: 'Excellent'
                }
            },
            recentActivity: 'Recent Activity',
            noActivity: 'No recent activity found.',
            settings: {
                title: 'Settings',
                subtitle: 'Manage your account and preferences',
                personalInfo: 'Personal Information',
                location: 'Location',
                locationPlaceholder: 'e.g. Cairo, Egypt',
                bio: 'Bio',
                bioPlaceholder: 'Tell us a bit about your farming...',
                security: 'Security',
                newPassword: 'New Password',
                confirmPassword: 'Confirm Password',
                saveChanges: 'Save Changes',
                updatePhoto: 'Update Photo',
                passwordMismatch: 'Passwords do not match',
                success: 'Settings saved successfully'
            },
            locked: {
                title: 'Welcome to Agricultural Vision Mind',
                message: 'Sign in to access your dashboard, manage farms, track plant health, and unlock AI-powered insights.',
                button: 'Sign In to Continue',
            },
        },
        plantDoctor: {
            pageTitle: 'AI Plant Doctor',
            pageSubtitle: 'Instant diagnosis and treatment plans',
            steps: {
                step1: 'Snap a Photo',
                step2: 'AI Analysis',
                step3: 'Get Cure'
            },
            mode: {
                upload: 'Upload/Camera',
                live: 'Real-time Scanner',
                soil: 'Soil Analyzer'
            },
            soilAnalyzer: {
                title: 'AI Soil Analyzer',
                subtitle: 'Identify soil type and moisture instantly.',
                analyzeButton: 'Analyze Soil',
                resultTitle: 'Soil Analysis Report',
                type: 'Soil Type',
                dryness: 'Moisture Level',
                composition: 'Composition',
                issues: 'Potential Issues',
                advice: 'Initial Advice',
                suitableCrops: 'Suitable Crops'
            },
            rapidDiagnosis: {
                title: 'Rapid Diagnosis',
                subtitle: 'Upload an image or video to identify diseases instantly.'
            },
            uploadArea: {
                prompt: 'Drop image or video here',
            },
            fileTypes: 'Supports JPG, PNG, MP4',
            addMorePhotos: 'Add More Photos',
            analyzeButton: 'Analyze Plant',
            errorProcessingFile: 'Error processing file',
            error: 'An error occurred during diagnosis.',
            cameraError: 'Could not access camera.',
            resultTitle: 'Diagnosis Result',
            identifiedPlant: 'Identified Plant',
            identifiedIssue: 'Identified Issue',
            confidence: 'Confidence',
            healthScore: 'Health Score',
            growthStageTitle: 'Growth Stage',
            consumptionAdvisory: {
                mainTitle: 'Consumption Advisory',
                symptomsTitle: 'Potential Symptoms',
                severityTitle: 'Severity',
                whatToDoTitle: 'What To Do'
            },
            visualCuesFromImage: 'Visual Cues',
            symptoms: 'Symptoms',
            cause: 'Cause',
            treatment: 'Treatment',
            prevention: 'Prevention',
            recommendedProducts: 'Recommended Products',
            secondaryDiagnosis: 'Secondary Possibility',
            trackPlant: 'Track Recovery',
            trackingInProgress: 'Tracking...',
            plantTracked: 'Tracking',
            plantTrackedSuccess: 'Plant added to tracking dashboard!',
            trackPlantFailed: 'Failed to add plant to the tracking dashboard.',
            downloadReport: 'Download PDF',
            trackAndDownloadDescription: 'Track recovery progress or save a detailed PDF report.',
            healthyMessage: 'Your plant looks healthy!',
            healthySubMessage: 'Keep up the good care.',
            visualCues: 'Visual Cues',
            loginToTrack: 'Please login to track plants.',
            liveMonitor: {
                modeDisease: 'Disease',
                modeGrowth: 'Growth',
                scanning: 'Scanning...',
                active: 'Active',
                alert: 'Issue Detected',
                noIssues: 'Healthy',
                growthHeight: 'Est. Height',
                growthStage: 'Stage'
            }
        },
        growthGuide: {
            pageTitle: 'Growth Guide',
            pageSubtitle: 'Expert care instructions for any plant',
            title: 'Plant Encyclopedia',
            searchPlaceholder: 'Enter plant name (e.g., Tomato, Rose)',
            searchButton: 'Get Guide',
            error: 'Please enter a plant name.',
            notFound: 'Guide not found for {{plantName}}',
            fetchError: 'Failed to fetch guide.',
            plantingInstructionsTitle: 'Planting Instructions',
            funFactsTitle: 'Fun Facts',
            downloadPdf: 'Download Guide',
            addToFarm: 'Add to Farm',
            listen: 'Listen to Guide',
            generatingAudio: 'Generating Audio...',
            watering: 'Watering',
            sunlight: 'Sunlight',
            soil: 'Soil',
            fertilizer: 'Fertilizer',
            pruning: 'Pruning',
            pestsAndDiseases: 'Pests & Diseases',
            tabs: {
                overview: 'Overview',
                care: 'Care',
                benefits: 'Benefits',
                context: 'Context'
            },
            descriptionTitle: 'Description',
            sections: {
                classification: 'Scientific Classification',
                toxicity: 'Toxicity Warning',
                healthBenefits: 'Health Benefits',
                culinaryUses: 'Culinary Uses',
                culturalSignificance: 'Cultural Significance'
            },
            family: 'Family',
            origin: 'Origin',
            careDetailsTitle: 'Care Details',
            pdf: {
                reportTitle: 'Growth Guide'
            }
        },
        diseaseLibrary: {
            pageTitle: 'Disease Library',
            pageSubtitle: 'Comprehensive database of plant diseases',
            tabs: {
                library: 'Library',
                heatmap: 'Outbreak Heatmap'
            },
            loading: 'Loading library...',
            error: 'Failed to load disease library.',
            details: {
                symptoms: 'Symptoms',
                treatment: 'Treatment',
                prevention: 'Prevention',
                close: 'Close'
            },
            heatmap: {
                searchPlaceholder: 'Search location (e.g. Cairo)',
                searchButton: 'Search',
                alert: 'Bio-Security Alert',
                alertText: 'Critical disease outbreaks detected in your region.',
                scanning: 'Scanning region...',
                strategyTitle: 'Regional Strategy',
                title: 'Local Outbreaks',
                reportedBy: '{{count}} reports',
                distance: '{{km}} km away',
                preventiveAdvice: 'Advice',
                noOutbreaks: 'No major outbreaks reported recently.'
            }
        },
        community: {
            pageTitle: 'Community Hub',
            pageSubtitle: 'Connect with other farmers and experts',
            searchPlaceholder: 'Search topics...',
            createPost: 'Create Post',
            categories: {
                all: 'All',
                general: 'General',
                question: 'Question',
                tips: 'Tips',
                showcase: 'Showcase'
            },
            noPosts: 'No posts found.',
            moderatorBadge: 'AI Moderated',
            post: {
                loginToInteract: 'Login to interact',
                like: 'Likes',
                comment: 'Comments',
                addComment: 'Write a comment...'
            },
            createModal: {
                title: 'Create New Post',
                loginReq: 'Please login to create a post.',
                postTitle: 'Title',
                titlePlaceholder: 'Interesting title...',
                category: 'Category',
                content: 'Content',
                contentPlaceholder: 'Share your thoughts...',
                image: 'Image (Optional)',
                submit: 'Post',
                moderating: 'Moderating...',
                moderationError: 'Content flagged as unsafe: {{reason}}'
            }
        },
        news: {
            title: 'Agri-News',
            description: 'Latest updates from the agricultural world',
            refresh: 'Refresh',
            refreshing: 'Refreshing...',
            tryAgain: 'Try Again',
            error: 'Failed to load news.',
            listen: 'Listen to Article',
            audioUnsupported: 'Audio playback is not supported in this browser.',
            audioError: 'Failed to play the article audio.',
            noNews: 'No news available.',
            noNewsSub: 'Check back later for updates.'
        },
        chatbot: {
            title: 'AI Assistant',
            welcome: 'Hello! I am your AI agricultural assistant. How can I help you today?',
            error: 'Sorry, I encountered an error. Please try again.',
            placeholder: 'Type your question...'
        },
        voiceAssistant: {
            title: 'Voice Assistant',
            listening: 'Listening...',
            processing: 'Thinking...',
            errorMic: 'Microphone access denied.',
            errorApi: 'Connection error.',
            close: 'Close',
            description: 'Ask me anything about your farm or plants.'
        },
        weather: {
            title: 'Weather',
            error: 'Weather data unavailable',
            humidity: 'Humidity',
            wind: 'Wind',
            pressure: 'Pressure'
        },
        footer: {
            description: 'Empowering farmers with AI-driven diagnostics and insights for a sustainable future.',
            headings: {
                features: 'Features',
                legal: 'Legal',
                newsletter: 'Newsletter'
            },
            links: {
                plantDoctor: 'Plant Doctor',
                growthGuide: 'Growth Guide',
                performanceAnalytics: 'Analytics',
                diseaseLibrary: 'Library',
                contactUs: 'Contact Us',
                privacyPolicy: 'Privacy Policy',
                termsOfUse: 'Terms of Use',
                faq: 'FAQ'
            },
            newsletterDesc: 'Subscribe for the latest updates and tips.',
            subscribe: 'Subscribe',
            copyright: '© {{year}} Agricultural Vision Mind. All rights reserved.'
        },
        contactPage: {
            title: 'Contact Us',
            subtitle: 'We are here to help',
            getInTouch: 'Get in Touch',
            description: 'Have questions? We would love to hear from you.',
            email: 'Email',
            location: 'Location',
            locationValue: 'Cairo, Egypt',
            phone: 'Phone',
            sendMessage: 'Send a Message',
            form: {
                name: 'Name',
                namePlaceholder: 'Your Name',
                email: 'Email',
                emailPlaceholder: 'your@email.com',
                subject: 'Subject',
                subjectPlaceholder: 'What is this about?',
                message: 'Message',
                messagePlaceholder: 'How can we help?',
                submit: 'Send Message',
                disclaimer: 'We will get back to you as soon as possible.'
            }
        },
        onboarding: {
            welcome: 'Welcome to Agricultural Vision Mind',
            subtitle: 'Your AI farming assistant is ready.',
            step1Title: 'Take a photo',
            step1Desc: 'Point your camera at any plant showing disease, pest damage, or unusual symptoms.',
            step2Title: 'Get instant AI diagnosis',
            step2Desc: 'Gemini AI identifies the exact issue and delivers a complete treatment plan in seconds.',
            step3Title: 'Track & manage',
            step3Desc: 'Monitor recovery progress, manage your farms, and build a complete crop health history.',
            startScan: 'Start My First Scan',
            skip: 'Skip for now',
        },
        homePage: {
            hero: {
                title: 'Cultivating a',
                subtitle: 'Diagnose diseases, track growth, and optimize yields with our advanced AI agricultural assistant.',
                button: 'Start Diagnosis',
                secondaryButton: 'Learn More',
                eyebrow: 'AI-Powered Agriculture Platform',
                gradientTitle: 'Smart Future',
                description: 'Agricultural Vision Mind combines real-time plant diagnosis, precision farm management, satellite crop monitoring, financial analytics, and a global farming community.',
                trustBadge1: 'No credit card required',
                trustBadge2: 'Free to start',
                trustBadge3: 'Trusted by 50k+ farmers',
                scannerLabel: 'AI Vision Active',
            },
            whyUs: {
                title: 'Why Choose Us?',
                cards: {
                    accuracy: { title: '98% Accuracy', desc: 'Powered by advanced Gemini AI models.' },
                    speed: { title: 'Instant Results', desc: 'Get diagnosis and treatment in seconds.' },
                    community: { title: 'Community', desc: 'Connect with experts and other farmers.' },
                    available: { title: '24/7 Availability', desc: 'Your AI assistant never sleeps.' }
                }
            },
            sustainability: {
                title: 'Sustainable Farming',
                subtitle: 'We promote eco-friendly practices to ensure long-term soil health and crop productivity.',
                eyebrow: 'Sustainable Agriculture',
                description: 'Our AI helps reduce chemical use by precisely targeting treatments, lowering water consumption, and promoting long-term soil health.',
                stat1: 'Water Saving',
                stat2: 'Pest Control',
                stat3: 'Crop Health'
            },
            smartDiagnosis: {
                title: 'Smart Plant Diagnosis',
                subtitle: 'Simply take a photo and let our AI do the rest.',
                eyebrow: 'AI-Powered Diagnosis',
                description: 'Our Gemini AI model analyzes visual symptoms, cross-references global disease databases, and delivers expert-grade treatment plans in seconds.',
                tryButton: 'Try Plant Doctor',
                scannerStatus: 'AI Analysis Ready',
                scannerDesc: 'Upload any plant image',
                checklist: {
                    item1: 'Instant Disease Identification',
                    item2: 'Detailed Treatment Plans',
                    item3: 'Prevention Tips',
                    item4: 'Growth Stage Analysis'
                }
            },
            growthGuide: {
                title: 'Comprehensive Growth Guides',
                subtitle: 'Everything you need to know to grow healthy crops.',
                checklist: {
                    item1: 'Watering Schedules',
                    item3: 'Soil Requirements',
                    item4: 'Fertilizer Tips',
                    item6: 'Harvesting Guide'
                }
            },
            mainFeatures: {
                title: 'All Platform Features',
                subtitle: 'A complete intelligent ecosystem for modern agriculture — every tool you need, all in one place.',
                explore: 'Explore',
                eyebrow: 'Complete Platform',
                platformBannerTitle: 'One Platform. Every Tool.',
                platformBannerDesc: 'From diagnosis to harvest, everything you need to run a modern, data-driven farm.',
                platformBannerButton: 'Get Started Free',
                badgeAiPowered: 'AI Powered',
                badgeKnowledge: 'Knowledge Base',
                badgeManagement: 'Management',
                badgeCommunity: 'Community',
                cards: {
                    plantDoctor: { title: 'Plant Doctor', description: 'Upload a photo and our AI instantly diagnoses diseases, pests, and nutrient deficiencies with detailed, actionable treatment plans.' },
                    growthGuide: { title: 'Growth Guide', description: 'Access comprehensive care guides, optimal watering schedules, soil requirements, and step-by-step harvesting tips for thousands of crop varieties.' },
                    diseaseLibrary: { title: 'Disease Library', description: 'Browse our extensive library of 500+ plant diseases with full symptom descriptions, root causes, treatment protocols, and prevention strategies.' },
                    dashboard: { title: 'Smart Dashboard', description: 'Your central command center — monitor farm health scores, track performance metrics, and receive AI-powered recommendations at a glance.' },
                    farmManagement: { title: 'Farm Management', description: 'Manage multiple farms and fields with interactive GPS maps, crop cycle tracking, soil analysis records, and automated alerts.' },
                    community: { title: 'Community Hub', description: 'Connect with tens of thousands of farmers worldwide, share hands-on experiences, ask questions, and get advice from verified agricultural experts.' },
                    news: { title: 'Agricultural News', description: 'Stay ahead with curated news, scientific research updates, market price trends, and seasonal advisories tailored to your crops and region.' },
                    smartChat: { title: 'Smart Chat AI', description: 'Get instant, expert-level answers to any farming question from our always-on Gemini AI assistant — available 24/7, no waiting required.' },
                    voiceAssistant: { title: 'Voice Assistant', description: 'Hands-free AI guidance right in the field — speak naturally and receive detailed agricultural advice without ever touching your phone.' },
                    satelliteMonitoring: { title: 'Satellite Monitoring', description: 'View your fields from space with NDVI vegetation analysis, real-time crop health heatmaps, and historical satellite imagery comparisons.' },
                    financeManager: { title: 'Finance Manager', description: 'Track all farm income and expenses, analyze profitability per field, and receive AI-powered financial insights and forecasts.' },
                    expertSupport: { title: 'Expert Support', description: 'Reach our agricultural specialists directly for personalized consultations, technical troubleshooting, and professional agronomic guidance.' }
                }
            },
            stats: {
                farmers: { value: '50,000+', label: 'Active Farmers' },
                diseases: { value: '500+', label: 'Plant Diseases' },
                accuracy: { value: '98%', label: 'AI Accuracy' },
                countries: { value: '120+', label: 'Countries' }
            },
            howItWorks: {
                title: 'How It Works',
                subtitle: 'From field problem to solution in three simple steps',
                step1: { number: '01', title: 'Capture & Upload', desc: 'Take a photo or video of your plant or crop with any device. Our system supports images, video frames, and live camera analysis.' },
                step2: { number: '02', title: 'AI Deep Analysis', desc: 'Our advanced Gemini AI analyzes your submission in seconds, cross-referencing 500+ disease patterns against a global agricultural knowledge base.' },
                step3: { number: '03', title: 'Act on Insights', desc: 'Receive a precise diagnosis, a personalized treatment plan, and long-term prevention recommendations to protect your entire harvest.' }
            },
            advancedDashboard: {
                title: 'Advanced Dashboard',
                subtitle: 'Monitor everything in one place',
                cards: {
                    recoveryTracking: { title: 'Recovery Tracking', description: 'Monitor plant health over time.' },
                    farmManagement: { title: 'Farm Management', description: 'Manage multiple fields and crops.' },
                    diseaseLibrary: { title: 'Smart Alerts', description: 'Get notified about risks.' }
                }
            },
            cta: {
                title: 'Ready to modernize your farm?',
                subtitle: 'Join thousands of farmers using AI to improve their yields.',
                button: 'Get Started Now'
            },
            landing: {
                nav: {
                    home: 'Home',
                    features: 'Features',
                    workflow: 'How It Works',
                    about: 'About',
                    contact: 'Contact'
                },
                header: {
                    subtitle: 'Smart Farming Platform',
                    toggleLanguage: 'Switch language',
                    toggleTheme: 'Toggle theme',
                    openMenu: 'Open navigation menu',
                    closeMenu: 'Close navigation menu',
                    profileMenu: 'Open profile menu',
                    dashboard: 'Dashboard',
                    profile: 'Profile Settings',
                    logout: 'Logout'
                },
                hero: {
                    badge: 'AI-Powered Smart Agriculture',
                    titlePrefix: 'AI-Powered Agriculture ',
                    highlight: 'For Healthier Crops',
                    titleSuffix: ' ',
                    description: 'Diagnose plant diseases, monitor crop health, track your farms, and receive practical agricultural guidance powered by artificial intelligence.',
                    primary: 'Start Diagnosis',
                    secondary: 'Explore Features',
                    actionsLabel: 'Home page primary actions',
                    trustLabel: 'Platform trust indicators',
                    imageLabel: 'Agricultural intelligence illustration',
                    imageAlt: 'Young plant held carefully in a hand, representing AI-powered smart agriculture',
                    trust: {
                        fast: 'Fast AI Analysis',
                        farms: 'Farm Management',
                        tracking: 'Crop Health Tracking'
                    },
                    floating: {
                        health: 'AI Plant Health',
                        detection: 'Early Disease Detection',
                        analytics: 'Farm Analytics'
                    }
                },
                capabilities: {
                    label: 'Platform capabilities',
                    heading: 'Our Main Features',
                    diagnosis: { title: 'AI Disease Diagnosis', text: 'Check visible crop symptoms and review practical next steps.' },
                    monitoring: { title: 'Farm Monitoring', text: 'Keep crop cycles, fields, and farm activity organized.' },
                    guidance: { title: 'Growth Guidance', text: 'Use care guidance for irrigation, fertilization, and daily crop needs.' },
                    community: { title: 'Community Support', text: 'Share knowledge and stay connected with agricultural updates.' },
                    soilHealth: { title: 'Soil Health Checks', text: 'Review soil conditions, inputs, and field readiness in one view.' },
                    weatherInsights: { title: 'Weather Insights', text: 'Follow climate signals that can shape risk, timing, and care.' }
                },
                features: {
                    eyebrow: 'Platform Tools',
                    title: 'Everything You Need to Manage Your Crops',
                    subtitle: 'Use intelligent tools to diagnose problems early, organize your farms, and make better agricultural decisions.',
                    action: 'Open',
                    cards: {
                        plantDoctor: { title: 'Plant Doctor', text: 'Upload a plant image or use your camera to identify visible symptoms and receive a detailed AI-assisted diagnosis.' },
                        growthGuide: { title: 'Growth Guide', text: 'Access practical guidance for crop growth stages, irrigation, fertilization, and daily care.' },
                        farmManagement: { title: 'Farm Management', text: 'Organize your farms, crop cycles, plants, and agricultural tasks from a single workspace.' },
                        cropTracking: { title: 'Crop Tracking', text: 'Track plant recovery progress and review previous health checks over time.' },
                        diseaseLibrary: { title: 'Disease Library', text: 'Explore common plant diseases, symptoms, prevention methods, and recommended actions.' },
                        communityNews: { title: 'Community and News', text: 'Exchange knowledge with other users and stay informed with agricultural news.' }
                    }
                },
                workflow: {
                    eyebrow: 'Simple Workflow',
                    title: 'How It Works',
                    subtitle: 'Get useful agricultural insights in a few simple steps.',
                    button: 'Try Plant Doctor',
                    steps: {
                        upload: { title: 'Upload a Plant Image', text: 'Choose a clear image from your device or capture a new photo using your camera.' },
                        analysis: { title: 'Receive an AI-Assisted Analysis', text: 'Review the likely issue, visible symptoms, confidence level, and recommended next actions.' },
                        save: { title: 'Save the Result and Track Progress', text: 'Save the diagnosis and monitor the plant condition over time.' }
                    }
                },
                about: {
                    eyebrow: 'About the Platform',
                    title: 'Smarter Tools for Better Crop Care',
                    description: 'Agricultural Vision Mind brings plant diagnosis, farm organization, crop tracking, agricultural guidance, community knowledge, and useful insights together in one platform.',
                    points: {
                        diagnose: 'Diagnose visible crop issues early.',
                        organize: 'Keep farms and tasks organized.',
                        track: 'Track plant health changes over time.'
                    }
                },
                cta: {
                    title: 'Start Managing Your Crops More Intelligently',
                    description: 'Use Agricultural Vision Mind to diagnose plant issues, monitor your farms, and make better decisions throughout the growing season.',
                    primary: 'Start Diagnosis',
                    secondary: 'Create an Account'
                }
            }
        },
        agriStore: {
            eyebrow: 'Trusted External Catalog',
            title: 'Agricultural Store',
            subtitle: 'Browse agricultural products from Harraz Farm & Garden and Orkida. Purchases are completed on the original merchant website.',
            searchPlaceholder: 'Search products...',
            sourceLabel: 'Product source',
            allStores: 'All stores',
            categoryLabel: 'Product category',
            allCategories: 'All categories',
            buyNow: 'View product',
            sale: 'Sale',
            outOfStock: 'Out of stock',
            priceUnavailable: 'Price unavailable',
            results: '{{count}} products',
            catalogReady: 'Products from Harraz and Orkida',
            sourceNotice: 'Products and prices supplied by',
            loadError: 'Products could not be loaded',
            retry: 'Try again',
            noProducts: 'No matching products',
            noProductsHint: 'Try another search term or category.',
            previous: 'Previous',
            next: 'Next',
            pageStatus: 'Page {{page}} of {{totalPages}}',
            currentPage: 'Page {{page}}'
        },
        timeLapse: {
            title: 'Time-Lapse',
            exporting: 'Exporting...',
            success: 'Time-lapse saved!',
            music: 'Toggle Music',
            share: 'Share'
        },
        pdf: {
            reportTitle: 'Agricultural Vision Mind Report',
            theme: 'Theme',
            language: 'Language',
            print: 'Print',
            toggleTheme: 'Toggle Dark/Light Mode',
            toggleLang: 'Toggle Language'
        }
    },
    ar: {
        app: {
            title: 'الرؤية الزراعية الذكية',
            login: 'تسجيل الدخول',
            logout: 'تسجيل الخروج',
            signUp: 'إنشاء حساب',
            buttons: {
                doctor: 'طبيب النبات',
                guide: 'دليل النمو',
                dashboard: 'لوحة التحكم',
                library: 'مكتبة الأمراض',
                community: 'المجتمع',
                contact: 'اتصل بنا',
                home: 'الرئيسية'
            },
            openChat: 'فتح المحادثة'
        },
        modals: {
            profile: {
                title: 'إعدادات الملف الشخصي',
                name: 'الاسم',
                email: 'البريد الإلكتروني',
                password: 'كلمة المرور',
                loginTab: 'دخول',
                signupTab: 'تسجيل',
                save: 'حفظ التغييرات',
                cancel: 'إلغاء',
                userNotFound: 'المستخدم غير موجود',
                emailExists: 'البريد الإلكتروني مسجل مسبقاً',
                loginWithGoogle: 'المتابعة عبر جوجل',
                loginWithMicrosoft: 'المتابعة عبر مايكروسوفت',
                loginWithYahoo: 'المتابعة عبر ياهو',
                or: 'أو',
                noAccount: "ليس لديك حساب؟",
                hasAccount: "لديك حساب بالفعل؟",
                aiModel: 'نموذج الذكاء الاصطناعي',
                checkForUpdates: 'تحقق من التحديثات',
                checking: 'جاري التحقق...',
                upToDate: 'النموذج محدث',
                updated: 'تم تحديث النموذج إلى {{version}}!',
                changePicture: 'تغيير الصورة'
            },
            farm: {
                addTitle: 'إضافة مزرعة جديدة',
                editTitle: 'تعديل المزرعة',
                cropName: 'اسم المحصول',
                cropPlaceholder: 'مثل: ذرة',
                area: 'المساحة',
                unit: 'الوحدة',
                acres: 'فدان',
                hectares: 'هكتار',
                soilType: 'نوع التربة',
                plantingDate: 'تاريخ الزراعة',
                growingSeason: 'موسم النمو',
                seasonPlaceholder: 'مثل: ربيع 2024',
                photo: 'صورة المزرعة',
                save: 'حفظ المزرعة',
                saving: 'جاري الحفظ...',
                cancel: 'إلغاء',
                delete: 'حذف المزرعة',
                validationError: 'يرجى ملء جميع الحقول المطلوبة',
                deleteConfirmTitle: 'حذف هذه المزرعة؟',
                deleteConfirmDesc: 'ستُحذف جميع بيانات المزرعة نهائياً. لا يمكن التراجع عن هذا الإجراء.',
                deleteConfirm: 'نعم، احذف',
                deleteCancel: 'إبقاء المزرعة',
            },
            trackedPlant: {
                title: 'تتبع: {{name}}',
                addLogPrompt: 'مر أكثر من أسبوع على آخر فحص. أضف سجلاً جديداً لتحديث التقدم.',
                initialDiagnosis: 'التشخيص الأولي',
                symptoms: 'الأعراض',
                treatment: 'العلاج',
                progressTimeline: 'الجدول الزمني للتقدم',
                noLogs: 'لا توجد سجلات تقدم بعد.',
                addLogTitle: 'إضافة سجل تقدم',
                addPhoto: 'إضافة صورة حالية',
                notesPlaceholder: 'أضف ملاحظات حول الحالة الحالية...',
                analyzeAndLog: 'تحليل وتسجيل التقدم',
                analyzing: 'جاري التحليل...',
                saving: 'جاري الحفظ...',
                deleteTracking: 'إيقاف التتبع',
                close: 'إغلاق',
                photoRequired: 'يرجى رفع صورة للتحليل.',
                urlError: 'لا يمكن تحليل الصورة الأولية (رابط خارجي). يرجى رفع صورة جديدة.',
                aiAnalysis: 'تحليل الذكاء الاصطناعي'
            }
        },
        dashboard: {
            hello: 'مرحباً، {{name}}',
            pageSubtitle: 'مركز القيادة الزراعي الخاص بك',
            crowdAlert: 'تنبيه إقليمي',
            crowdAlertText: 'تم الإبلاغ عن مخاطر عالية لمرض {{disease}} في منطقتك.',
            stats: {
                diagnosesThisMonth: 'تشخيصات (شهر)',
                healthScore: 'متوسط الصحة',
                plantedPlants: 'نباتات متتبعة',
                activeFarms: 'مزارع نشطة'
            },
            sidebar: {
                title: 'المساعد الذكي',
                welcome: 'مرحباً، {{name}}',
                notifications: 'الإشعارات',
                checkupAlert: '{{plant}} يحتاج إلى فحص.',
                checkupAction: 'افحص الآن',
                weatherAlert: 'توقعات بأمطار غزيرة غداً.',
                overview: 'نظرة عامة',
                myFarms: 'مزارعي',
                satellite: 'الأقمار الصناعية',
                tracking: 'التتبع',
                analytics: 'التحليلات',
                finance: 'المالية',
                store: 'المتجر الزراعي',
                forecasts: 'التوقعات',
                alerts: 'التنبيهات',
                settings: 'الإعدادات'
            },
            finance: {
                title: 'نظرة عامة مالية',
                subtitle: 'تتبع الدخل والمصروفات ورؤى الذكاء الاصطناعي.',
                addTransaction: 'معاملة جديدة',
                income: 'إجمالي الدخل',
                expenses: 'إجمالي المصروفات',
                netProfit: 'صافي الربح',
                aiAnalysis: 'التحليل المالي الذكي',
                analyzing: 'جاري تحليل الصحة المالية...',
                transactionHistory: 'سجل المعاملات',
                noTransactions: 'لم يتم تسجيل أي معاملات بعد.',
                modal: {
                    title: 'معاملة جديدة',
                    type: 'النوع',
                    incomeType: 'دخل',
                    expenseType: 'مصروف',
                    amount: 'المبلغ',
                    date: 'التاريخ',
                    category: 'التصنيف',
                    description: 'الوصف',
                    farm: 'المزرعة (اختياري)',
                    save: 'حفظ المعاملة'
                },
                categories: {
                    Seeds: 'بذور',
                    Fertilizers: 'أسمدة',
                    Labor: 'عمالة',
                    Fuel: 'وقود',
                    Equipment: 'معدات',
                    Sale: 'بيع',
                    Other: 'أخرى'
                }
            },
            predictive: {
                title: 'التنبؤ بالأمراض',
                risk: 'خطر',
                noRisks: 'لا توجد مخاطر عالية متوقعة لمحاصيلك بناءً على الطقس الحالي.',
                crop: 'المحصول المتأثر',
                action: 'إجراء وقائي'
            },
            productivityChart: {
                title: 'اتجاه الإنتاجية'
            },
            performanceAnalytics: {
                title: 'تحليلات الأداء',
                noData: 'لا توجد بيانات مزارع متاحة للتحليل.',
                error: 'فشل تحميل التحليلات.',
                kpi: {
                    averageYield: 'متوسط الإنتاج',
                    bestCrop: 'أفضل محصول',
                    bestSoil: 'أفضل تربة',
                    totalFarms: 'إجمالي المزارع'
                },
                cropPerformanceTitle: 'أداء المحاصيل',
                tableHeaders: {
                    crop: 'المحصول',
                    avgYield: 'متوسط الإنتاج',
                    totalArea: 'إجمالي المساحة'
                },
                insightsTitle: 'رؤى الذكاء الاصطناعي',
                yieldPrediction: 'توقع الإنتاج'
            },
            myFarms: 'مزارعي',
            noFarms: 'لم تتم إضافة مزارع',
            noFarmsSub: 'ابدأ بإضافة مزرعتك الأولى لتتبع المحاصيل والتربة.',
            addFarm: 'إضافة مزرعة',
            smartSchedule: 'الجدول الذكي',
            weatherDelay: 'مؤجل بسبب المطر',
            tracking: {
                title: 'النباتات المتتبعة',
                subtitle: 'راقب تعافي ونمو نباتاتك المشخصة.',
                noPlants: 'لا توجد نباتات متتبعة',
                noPlantsSub: 'شخص نباتاً واختر "تتبع" لرؤيته هنا.',
            },
            viewReport: 'عرض التقرير',
            geoAgri: {
                title: 'التحليل الجغرافي الزراعي',
                subtitle: 'رؤى الذكاء الاصطناعي بناءً على موقعك',
                loading: 'جاري تحليل بيانات التربة والمناخ المحلية...',
                error: 'تعذر تحميل بيانات الموقع.',
                soilType: 'نوع التربة',
                suitableCrops: 'المحاصيل المناسبة',
                diseaseRisks: 'مخاطر الأمراض',
                climate: 'ملخص المناخ'
            },
            satellite: {
                title: 'مراقبة الأقمار الصناعية وNDVI',
                subtitle: 'متابعة صحة الغطاء النباتي من الفضاء باستخدام مضلع مزرعتك.',
                selectFarm: 'اختر المزرعة',
                refresh: 'تحديث',
                loading: 'جاري جلب أحدث صور الأقمار الصناعية...',
                error: 'تعذر تحميل بيانات الأقمار الصناعية.',
                noFarmsTitle: 'لا توجد حدود مزارع مرسومة',
                noFarmsSub: 'ارسم مضلع المزرعة أولاً من: مزارعي > تعديل/إضافة مزرعة > رسم الخريطة.',
                ndviScore: 'متوسط NDVI',
                healthStatus: 'صحة الغطاء النباتي',
                capturedAt: 'تاريخ الالتقاط',
                source: 'مصدر القمر الصناعي',
                cloudCoverage: 'نسبة السحب',
                pixelCount: 'عدد البكسلات المحللة',
                range: 'المدى',
                ndviHeatmap: 'الخريطة الحرارية NDVI',
                trueColor: 'الصورة الحقيقية',
                imageError: 'تعذر عرض الصورة. حاول التحديث.',
                legend: 'دليل عتبات NDVI',
                status: {
                    critical: 'حرج',
                    poor: 'ضعيف',
                    moderate: 'متوسط',
                    good: 'جيد',
                    excellent: 'ممتاز'
                }
            },
            recentActivity: 'النشاط الأخير',
            noActivity: 'لا يوجد نشاط حديث.',
            settings: {
                title: 'الإعدادات',
                subtitle: 'إدارة حسابك وتفضيلاتك',
                personalInfo: 'المعلومات الشخصية',
                location: 'الموقع',
                locationPlaceholder: 'مثل: القاهرة، مصر',
                bio: 'نبذة',
                bioPlaceholder: 'أخبرنا قليلاً عن زراعتك...',
                security: 'الأمان',
                newPassword: 'كلمة مرور جديدة',
                confirmPassword: 'تأكيد كلمة المرور',
                saveChanges: 'حفظ التغييرات',
                updatePhoto: 'تحديث الصورة',
                passwordMismatch: 'كلمات المرور غير متطابقة',
                success: 'تم حفظ الإعدادات بنجاح'
            },
            locked: {
                title: 'مرحباً بك في الرؤية الزراعية الذكية',
                message: 'سجّل دخولك للوصول إلى لوحة التحكم وإدارة المزارع وتتبع صحة النباتات والاستفادة من رؤى الذكاء الاصطناعي.',
                button: 'تسجيل الدخول للمتابعة',
            },
        },
        plantDoctor: {
            pageTitle: 'طبيب النبات الذكي',
            pageSubtitle: 'تشخيص فوري وخطط علاج',
            steps: {
                step1: 'التقط صورة',
                step2: 'تحليل الذكاء الاصطناعي',
                step3: 'احصل على العلاج'
            },
            mode: {
                upload: 'رفع/كاميرا',
                live: 'ماسح فوري',
                soil: 'محلل التربة'
            },
            soilAnalyzer: {
                title: 'محلل التربة بالذكاء الاصطناعي',
                subtitle: 'حدد نوع التربة ومستوى الرطوبة فوراً.',
                analyzeButton: 'تحليل التربة',
                resultTitle: 'تقرير تحليل التربة',
                type: 'نوع التربة',
                dryness: 'مستوى الرطوبة',
                composition: 'التكوين',
                issues: 'المشاكل المحتملة',
                advice: 'نصائح أولية',
                suitableCrops: 'المحاصيل المناسبة'
            },
            rapidDiagnosis: {
                title: 'تشخيص سريع',
                subtitle: 'ارفع صورة أو فيديو لتحديد الأمراض فوراً.'
            },
            uploadArea: {
                prompt: 'أفلت الصورة أو الفيديو هنا',
            },
            fileTypes: 'يدعم JPG, PNG, MP4',
            addMorePhotos: 'إضافة صور أخرى',
            analyzeButton: 'تحليل النبات',
            errorProcessingFile: 'خطأ في معالجة الملف',
            error: 'حدث خطأ أثناء التشخيص.',
            cameraError: 'تعذر الوصول للكاميرا.',
            resultTitle: 'نتيجة التشخيص',
            identifiedPlant: 'النبات المحدد',
            identifiedIssue: 'المشكلة المحددة',
            confidence: 'الثقة',
            healthScore: 'درجة الصحة',
            growthStageTitle: 'مرحلة النمو',
            consumptionAdvisory: {
                mainTitle: 'نصيحة الاستهلاك',
                symptomsTitle: 'الأعراض المحتملة',
                severityTitle: 'الشدة',
                whatToDoTitle: 'ماذا تفعل'
            },
            visualCuesFromImage: 'العلامات البصرية',
            symptoms: 'الأعراض',
            cause: 'السبب',
            treatment: 'العلاج',
            prevention: 'الوقاية',
            recommendedProducts: 'المنتجات الموصى بها',
            secondaryDiagnosis: 'احتمال ثانوي',
            trackPlant: 'تتبع التعافي',
            trackingInProgress: 'جارٍ إضافة النبات...',
            plantTracked: 'جاري التتبع',
            plantTrackedSuccess: 'تمت إضافة النبات للوحة التتبع!',
            trackPlantFailed: 'تعذر إضافة النبات إلى لوحة التتبع.',
            downloadReport: 'تحميل تقرير PDF',
            trackAndDownloadDescription: 'تتبع تقدم التعافي أو احفظ تقريراً مفصلاً.',
            healthyMessage: 'نباتك يبدو بصحة جيدة!',
            healthySubMessage: 'استمر في العناية الجيدة.',
            visualCues: 'العلامات البصرية',
            loginToTrack: 'يرجى تسجيل الدخول لتتبع النباتات.',
            liveMonitor: {
                modeDisease: 'أمراض',
                modeGrowth: 'نمو',
                scanning: 'جاري المسح...',
                active: 'نشط',
                alert: 'تم اكتشاف مشكلة',
                noIssues: 'صحي',
                growthHeight: 'الارتفاع التقديري',
                growthStage: 'المرحلة'
            }
        },
        growthGuide: {
            pageTitle: 'دليل النمو',
            pageSubtitle: 'إرشادات رعاية الخبراء لأي نبات',
            title: 'موسوعة النباتات',
            searchPlaceholder: 'أدخل اسم النبات (مثل: طماطم، ورد)',
            searchButton: 'احصل على الدليل',
            error: 'يرجى إدخال اسم النبات.',
            notFound: 'لم يتم العثور على دليل لـ {{plantName}}',
            fetchError: 'فشل جلب الدليل.',
            plantingInstructionsTitle: 'إرشادات الزراعة',
            funFactsTitle: 'حقائق ممتعة',
            downloadPdf: 'تحميل الدليل',
            addToFarm: 'إضافة للمزرعة',
            listen: 'استمع للدليل',
            generatingAudio: 'جاري توليد الصوت...',
            watering: 'الري',
            sunlight: 'أشعة الشمس',
            soil: 'التربة',
            fertilizer: 'التسميد',
            pruning: 'التقليم',
            pestsAndDiseases: 'الآفات والأمراض',
            tabs: {
                overview: 'نظرة عامة',
                care: 'العناية',
                benefits: 'الفوائد',
                context: 'السياق'
            },
            descriptionTitle: 'الوصف',
            sections: {
                classification: 'التصنيف العلمي',
                toxicity: 'تحذير السمية',
                healthBenefits: 'الفوائد الصحية',
                culinaryUses: 'الاستخدامات الطهوية',
                culturalSignificance: 'الأهمية الثقافية'
            },
            family: 'الفصيلة',
            origin: 'الموطن',
            careDetailsTitle: 'تفاصيل العناية',
            pdf: {
                reportTitle: 'دليل النمو'
            }
        },
        diseaseLibrary: {
            pageTitle: 'مكتبة الأمراض',
            pageSubtitle: 'قاعدة بيانات شاملة لأمراض النبات',
            tabs: {
                library: 'المكتبة',
                heatmap: 'خريطة تفشي الأمراض'
            },
            loading: 'جاري تحميل المكتبة...',
            error: 'فشل تحميل مكتبة الأمراض.',
            details: {
                symptoms: 'الأعراض',
                treatment: 'العلاج',
                prevention: 'الوقاية',
                close: 'إغلاق'
            },
            heatmap: {
                searchPlaceholder: 'ابحث عن موقع (مثل: القاهرة)',
                searchButton: 'بحث',
                alert: 'تنبيه أمن حيوي',
                alertText: 'تم اكتشاف تفشي أمراض خطيرة في منطقتك.',
                scanning: 'جاري مسح المنطقة...',
                strategyTitle: 'الاستراتيجية الإقليمية',
                title: 'تفشي محلي',
                reportedBy: '{{count}} تقرير',
                distance: 'على بعد {{km}} كم',
                preventiveAdvice: 'نصيحة',
                noOutbreaks: 'لم يتم الإبلاغ عن تفشي كبير مؤراً.'
            }
        },
        community: {
            pageTitle: 'مركز المجتمع',
            pageSubtitle: 'تواصل مع مزارعين وخبراء آخرين',
            searchPlaceholder: 'ابحث في المواضيع...',
            createPost: 'إنشاء منشور',
            categories: {
                all: 'الكل',
                general: 'عام',
                question: 'سؤال',
                tips: 'نصائح',
                showcase: 'عرض'
            },
            noPosts: 'لا توجد منشورات.',
            moderatorBadge: 'مراقب بالذكاء الاصطناعي',
            post: {
                loginToInteract: 'سجل الدخول للتفاعل',
                like: 'إعجابات',
                comment: 'تعليقات',
                addComment: 'اكتب تعليقاً...'
            },
            createModal: {
                title: 'إنشاء منشور جديد',
                loginReq: 'يرجى تسجيل الدخول لإنشاء منشور.',
                postTitle: 'العنوان',
                titlePlaceholder: 'عنوان مثير للاهتمام...',
                category: 'التصنيف',
                content: 'المحتوى',
                contentPlaceholder: 'شارك أفكارك...',
                image: 'صورة (اختياري)',
                submit: 'نشر',
                moderating: 'جاري المراجعة...',
                moderationError: 'تم تحديد المحتوى على أنه غير آمن: {{reason}}'
            }
        },
        news: {
            title: 'أخبار الزراعة',
            description: 'أحدث التحديثات من العالم الزراعي',
            refresh: 'تحديث',
            refreshing: 'جاري التحديث...',
            tryAgain: 'حاول مرة أخرى',
            error: 'فشل تحميل الأخبار.',
            listen: 'استمع للمقال',
            audioUnsupported: 'المتصفح الحالي لا يدعم تشغيل الصوت لهذه الميزة.',
            audioError: 'فشل تشغيل الصوت الخاص بالمقال.',
            noNews: 'لا توجد أخبار متاحة.',
            noNewsSub: 'تحقق لاحقاً للحصول على تحديثات.'
        },
        chatbot: {
            title: 'المساعد الذكي',
            welcome: 'مرحباً! أنا مساعدك الزراعي الذكي. كيف يمكنني مساعدتك اليوم؟',
            error: 'عذراً، واجهت خطأ. يرجى المحاولة مرة أخرى.',
            placeholder: 'اكتب سؤالك...'
        },
        voiceAssistant: {
            title: 'المساعد الصوتي',
            listening: 'جاري الاستماع...',
            processing: 'جاري التفكير...',
            errorMic: 'تم رفض الوصول للميكروفون.',
            errorApi: 'خطأ في الاتصال.',
            close: 'إغلاق',
            description: 'اسألني أي شيء عن مزرعتك أو نباتاتك.'
        },
        weather: {
            title: 'الطقس',
            error: 'بيانات الطقس غير متاحة',
            humidity: 'الرطوبة',
            wind: 'الرياح',
            pressure: 'الضغط'
        },
        footer: {
            description: 'تمكين المزارعين بتشخيصات ورؤى مدعومة بالذكاء الاصطناعي لمستقبل مستدام.',
            headings: {
                features: 'المميزات',
                legal: 'قانوني',
                newsletter: 'النشرة البريدية'
            },
            links: {
                plantDoctor: 'طبيب النبات',
                growthGuide: 'دليل النمو',
                performanceAnalytics: 'التحليلات',
                diseaseLibrary: 'المكتبة',
                contactUs: 'اتصل بنا',
                privacyPolicy: 'سياسة الخصوصية',
                termsOfUse: 'شروط الاستخدام',
                faq: 'الأسئلة الشائعة'
            },
            newsletterDesc: 'اشترك للحصول على آخر التحديثات والنصائح.',
            subscribe: 'اشترك',
            copyright: '© {{year}} الرؤية الزراعية الذكية. جميع الحقوق محفوظة.'
        },
        contactPage: {
            title: 'اتصل بنا',
            subtitle: 'نحن هنا للمساعدة',
            getInTouch: 'تواصل معنا',
            description: 'لديك أسئلة؟ نود أن نسمع منك.',
            email: 'البريد الإلكتروني',
            location: 'الموقع',
            locationValue: 'القاهرة، مصر',
            phone: 'الهاتف',
            sendMessage: 'أرسل رسالة',
            form: {
                name: 'الاسم',
                namePlaceholder: 'اسمك',
                email: 'البريد الإلكتروني',
                emailPlaceholder: 'your@email.com',
                subject: 'الموضوع',
                subjectPlaceholder: 'عما يدور هذا؟',
                message: 'الرسالة',
                messagePlaceholder: 'كيف يمكننا المساعدة؟',
                submit: 'إرسال الرسالة',
                disclaimer: 'سنرد عليك في أقرب وقت ممكن.'
            }
        },
        onboarding: {
            welcome: 'مرحباً بك في الرؤية الزراعية الذكية',
            subtitle: 'مساعدك الزراعي الذكي جاهز.',
            step1Title: 'التقط صورة',
            step1Desc: 'وجّه الكاميرا نحو أي نبات يعاني من مرض أو أضرار آفات أو أعراض غير عادية.',
            step2Title: 'احصل على تشخيص فوري بالذكاء الاصطناعي',
            step2Desc: 'يحدد ذكاء Gemini الاصطناعي المشكلة ويضع خطة علاج متكاملة في ثوانٍ.',
            step3Title: 'تتبع وأدِر',
            step3Desc: 'راقب تقدم التعافي وأدر مزارعك وابنِ سجلاً متكاملاً لصحة المحاصيل.',
            startScan: 'ابدأ أول فحص',
            skip: 'تخطَّ الآن',
        },
        homePage: {
            hero: {
                title: 'زراعة',
                subtitle: 'شخص الأمراض، تتبع النمو، وحسن الإنتاجية مع مساعدنا الزراعي الذكي المتطور.',
                button: 'ابدأ التشخيص',
                secondaryButton: 'اعرف المزيد',
                eyebrow: 'منصة زراعية مدعومة بالذكاء الاصطناعي',
                gradientTitle: 'مستقبل ذكي',
                description: 'الرؤية الزراعية الذكية تجمع بين تشخيص النباتات الفوري وإدارة المزارع الدقيقة ومراقبة المحاصيل عبر الأقمار الصناعية والتحليلات المالية ومجتمع المزارعين العالمي.',
                trustBadge1: 'لا يلزم بطاقة ائتمان',
                trustBadge2: 'مجاني للبدء',
                trustBadge3: 'يثق به أكثر من 50 ألف مزارع',
                scannerLabel: 'الذكاء الاصطناعي نشط',
            },
            whyUs: {
                title: 'لماذا تختارنا؟',
                cards: {
                    accuracy: { title: 'دقة 98%', desc: 'مدعوم بنماذج Gemini AI المتقدمة.' },
                    speed: { title: 'نتائج فورية', desc: 'احصل على التشخيص والعلاج في ثوانٍ.' },
                    community: { title: 'مجموعة مجتمعية', desc: 'تواصل مع الخبراء والمزارعين الآخرين.' },
                    available: { title: 'متاح 24/7', desc: 'مساعدك الذكي لا ينام أبداً.' }
                }
            },
            sustainability: {
                title: 'زراعة مستدامة',
                subtitle: 'نحن نشجع الممارسات الصديقة للبيئة لضمان صحة التربة وإنتاجية المحاصيل على المدى الطويل.',
                eyebrow: 'الزراعة المستدامة',
                description: 'يساعد ذكاؤنا الاصطناعي على تقليل استخدام المواد الكيماوية عن طريق استهداف العلاجات بدقة وخفض استهلاك المياه وتعزيز صحة التربة على المدى البعيد.',
                stat1: 'توفير المياه',
                stat2: 'مكافحة الآفات',
                stat3: 'صحة المحاصيل'
            },
            smartDiagnosis: {
                title: 'تشخيص ذكي للنبات',
                subtitle: 'ببساطة التقط صورة ودع الذكاء الاصطناعي يقوم بالباقي.',
                eyebrow: 'تشخيص بالذكاء الاصطناعي',
                description: 'يحلل نموذج Gemini الذكي الأعراض البصرية ويقارنها بقواعد بيانات الأمراض العالمية ليقدم خطط علاج على مستوى الخبراء في ثوانٍ.',
                tryButton: 'جرّب طبيب النبات',
                scannerStatus: 'التحليل الذكي جاهز',
                scannerDesc: 'ارفع أي صورة نبات',
                checklist: {
                    item1: 'تحديد فوري للأمراض',
                    item2: 'خطط علاج مفصلة',
                    item3: 'نصائح وقائية',
                    item4: 'تحليل مراحل النمو'
                }
            },
            growthGuide: {
                title: 'أدلة نمو شاملة',
                subtitle: 'كل ما تحتاج لمعرفته لزراعة محاصيل صحية.',
                checklist: {
                    item1: 'جداول الري',
                    item3: 'متطلبات التربة',
                    item4: 'نصائح التسميد',
                    item6: 'دليل الحصاد'
                }
            },
            mainFeatures: {
                title: 'جميع مميزات المنصة',
                subtitle: 'منظومة ذكية متكاملة للزراعة الحديثة — كل الأدوات التي تحتاجها في مكان واحد.',
                explore: 'استكشف',
                eyebrow: 'المنصة الكاملة',
                platformBannerTitle: 'منصة واحدة. كل الأدوات.',
                platformBannerDesc: 'من التشخيص حتى الحصاد، كل ما تحتاجه لإدارة مزرعة حديثة مبنية على البيانات.',
                platformBannerButton: 'ابدأ مجاناً',
                badgeAiPowered: 'ذكاء اصطناعي',
                badgeKnowledge: 'قاعدة معرفة',
                badgeManagement: 'إدارة',
                badgeCommunity: 'مجتمع',
                cards: {
                    plantDoctor: { title: 'طبيب النبات', description: 'ارفع صورة وسيشخص ذكاؤنا الاصطناعي على الفور الأمراض والآفات ونقص المغذيات مع خطط علاج تفصيلية وقابلة للتنفيذ.' },
                    growthGuide: { title: 'دليل النمو', description: 'احصل على أدلة رعاية شاملة وجداول ري مثلى ومتطلبات التربة وتعليمات حصاد خطوة بخطوة لآلاف أصناف المحاصيل.' },
                    diseaseLibrary: { title: 'مكتبة الأمراض', description: 'تصفح مكتبتنا الواسعة التي تضم أكثر من 500 مرض نباتي مع أوصاف كاملة للأعراض والأسباب وبروتوكولات العلاج واستراتيجيات الوقاية.' },
                    dashboard: { title: 'لوحة التحكم الذكية', description: 'مركز القيادة الخاص بك — راقب درجات صحة المزرعة وتتبع مؤشرات الأداء واحصل على توصيات مدعومة بالذكاء الاصطناعي بنظرة واحدة.' },
                    farmManagement: { title: 'إدارة المزارع', description: 'أدر مزارع وحقول متعددة بخرائط GPS تفاعلية وتتبع دورة المحاصيل وسجلات تحليل التربة والتنبيهات الآلية.' },
                    community: { title: 'مجتمع المزارعين', description: 'تواصل مع عشرات الآلاف من المزارعين حول العالم وشارك تجاربك الميدانية واطرح أسئلتك واحصل على نصائح من خبراء زراعيين معتمدين.' },
                    news: { title: 'أخبار زراعية', description: 'ابقَ في الصدارة بأخبار منتقاة وتحديثات بحثية علمية واتجاهات أسعار السوق وإرشادات موسمية مخصصة لمحاصيلك ومنطقتك.' },
                    smartChat: { title: 'المحادثة الذكية', description: 'احصل على إجابات فورية على مستوى الخبراء لأي سؤال زراعي من مساعدنا الذكي المتاح دائماً — على مدار الساعة طوال أيام الأسبوع.' },
                    voiceAssistant: { title: 'المساعد الصوتي', description: 'إرشاد ذكي بدون استخدام اليدين مباشرة في الحقل — تحدث بشكل طبيعي واستقبل نصائح زراعية مفصلة دون لمس هاتفك.' },
                    satelliteMonitoring: { title: 'المراقبة عبر الأقمار', description: 'شاهد حقولك من الفضاء مع تحليل NDVI لصحة النباتات وخرائط حرارية لصحة المحاصيل ومقارنات الصور الفضائية التاريخية.' },
                    financeManager: { title: 'المدير المالي', description: 'تتبع جميع إيرادات ومصروفات مزرعتك وحلل الربحية لكل حقل واحصل على رؤى مالية وتوقعات مدعومة بالذكاء الاصطناعي.' },
                    expertSupport: { title: 'دعم الخبراء', description: 'تواصل مع متخصصينا الزراعيين مباشرة للحصول على استشارات شخصية وحل المشكلات التقنية والإرشاد الزراعي المهني.' }
                }
            },
            stats: {
                farmers: { value: '+50,000', label: 'مزارع نشط' },
                diseases: { value: '+500', label: 'مرض نباتي' },
                accuracy: { value: '98%', label: 'دقة الذكاء الاصطناعي' },
                countries: { value: '+120', label: 'دولة' }
            },
            howItWorks: {
                title: 'كيف يعمل النظام',
                subtitle: 'من مشكلة الحقل إلى الحل في ثلاث خطوات بسيطة',
                step1: { number: '01', title: 'التقط وارفع', desc: 'التقط صورة أو فيديو لنباتك أو محصولك بأي جهاز. يدعم نظامنا الصور ولقطات الفيديو والتحليل بالكاميرا المباشرة.' },
                step2: { number: '02', title: 'تحليل عميق بالذكاء الاصطناعي', desc: 'يحلل ذكاؤنا الاصطناعي المتقدم إرسالك في ثوانٍ مقارنةً بأكثر من 500 نمط مرضي مقابل قاعدة معرفة زراعية عالمية.' },
                step3: { number: '03', title: 'تصرف بناءً على الرؤى', desc: 'استقبل تشخيصاً دقيقاً وخطة علاجية شخصية وتوصيات وقاية طويلة المدى لحماية محصولك بأكمله.' }
            },
            advancedDashboard: {
                title: 'لوحة تحكم متقدمة',
                subtitle: 'راقب كل شيء في مكان واحد',
                cards: {
                    recoveryTracking: { title: 'تتبع التعافي', description: 'راقب صحة النبات بمرور الوقت.' },
                    farmManagement: { title: 'إدارة المزرعة', description: 'أدر حقول ومحاصيل متعددة.' },
                    diseaseLibrary: { title: 'تنبيهات ذكية', description: 'احصل على إشعارات بالمخاطر.' }
                }
            },
            cta: {
                title: 'جاهز لتحديث مزرعتك؟',
                subtitle: 'انضم لآلاف المزارعين الذين يستخدمون الذكاء الاصطناعي لتحسين محاصيلهم.',
                button: 'ابدأ الآن'
            },
            landing: {
                nav: {
                    home: 'الرئيسية',
                    features: 'المميزات',
                    workflow: 'كيف يعمل',
                    about: 'عن المنصة',
                    contact: 'تواصل معنا'
                },
                header: {
                    subtitle: 'منصة زراعة ذكية',
                    toggleLanguage: 'تبديل اللغة',
                    toggleTheme: 'تبديل المظهر',
                    openMenu: 'فتح قائمة التنقل',
                    closeMenu: 'إغلاق قائمة التنقل',
                    profileMenu: 'فتح قائمة الملف الشخصي',
                    dashboard: 'لوحة التحكم',
                    profile: 'إعدادات الملف الشخصي',
                    logout: 'تسجيل الخروج'
                },
                hero: {
                    badge: 'زراعة ذكية مدعومة بالذكاء الاصطناعي',
                    titlePrefix: 'زراعة مدعومة بالذكاء الاصطناعي ',
                    highlight: 'لمحاصيل أكثر صحة',
                    titleSuffix: ' ',
                    description: 'شخص أمراض النباتات، وراقب صحة المحاصيل، وتتبع مزارعك، واحصل على إرشادات زراعية عملية مدعومة بالذكاء الاصطناعي.',
                    primary: 'ابدأ التشخيص',
                    secondary: 'استكشف المميزات',
                    actionsLabel: 'إجراءات الصفحة الرئيسية',
                    trustLabel: 'مؤشرات الثقة في المنصة',
                    imageLabel: 'رسم يوضح الذكاء الزراعي',
                    imageAlt: 'نبتة صغيرة محمولة بعناية في يد، تعبر عن الزراعة الذكية المدعومة بالذكاء الاصطناعي',
                    trust: {
                        fast: 'تحليل سريع بالذكاء الاصطناعي',
                        farms: 'إدارة المزارع',
                        tracking: 'متابعة صحة المحاصيل'
                    },
                    floating: {
                        health: 'صحة النبات بالذكاء الاصطناعي',
                        detection: 'اكتشاف مبكر للأمراض',
                        analytics: 'تحليلات المزرعة'
                    }
                },
                capabilities: {
                    label: 'قدرات المنصة',
                    heading: 'أهم مميزات المنصة',
                    diagnosis: { title: 'تشخيص الأمراض بالذكاء الاصطناعي', text: 'افحص أعراض المحاصيل الظاهرة وراجع خطوات عملية تالية.' },
                    monitoring: { title: 'مراقبة المزرعة', text: 'نظم دورات المحاصيل والحقول وأنشطة المزرعة.' },
                    guidance: { title: 'إرشادات النمو', text: 'استخدم إرشادات العناية للري والتسميد واحتياجات المحصول اليومية.' },
                    community: { title: 'دعم المجتمع', text: 'شارك المعرفة وابق على اتصال بالتحديثات الزراعية.' },
                    soilHealth: { title: 'فحص صحة التربة', text: 'راجع حالة التربة والمدخلات وجاهزية الحقل من شاشة واحدة.' },
                    weatherInsights: { title: 'رؤى الطقس', text: 'تابع إشارات المناخ التي تؤثر في المخاطر والتوقيت والعناية.' }
                },
                features: {
                    eyebrow: 'أدوات المنصة',
                    title: 'كل ما تحتاجه لإدارة محاصيلك',
                    subtitle: 'استخدم أدوات ذكية لتشخيص المشكلات مبكرا، وتنظيم مزارعك، واتخاذ قرارات زراعية أفضل.',
                    action: 'افتح',
                    cards: {
                        plantDoctor: { title: 'طبيب النبات', text: 'ارفع صورة للنبات أو استخدم الكاميرا لتحديد الأعراض الظاهرة والحصول على تشخيص مفصل بمساعدة الذكاء الاصطناعي.' },
                        growthGuide: { title: 'دليل النمو', text: 'احصل على إرشادات عملية لمراحل نمو المحاصيل والري والتسميد والرعاية اليومية.' },
                        farmManagement: { title: 'إدارة المزارع', text: 'نظم مزارعك ودورات المحاصيل والنباتات والمهام الزراعية من مساحة عمل واحدة.' },
                        cropTracking: { title: 'تتبع المحاصيل', text: 'تابع تقدم تعافي النباتات وراجع الفحوصات الصحية السابقة بمرور الوقت.' },
                        diseaseLibrary: { title: 'مكتبة الأمراض', text: 'استكشف أمراض النباتات الشائعة والأعراض وطرق الوقاية والإجراءات المقترحة.' },
                        communityNews: { title: 'المجتمع والأخبار', text: 'تبادل المعرفة مع المستخدمين وابق على اطلاع بالأخبار الزراعية.' }
                    }
                },
                workflow: {
                    eyebrow: 'خطوات بسيطة',
                    title: 'كيف يعمل النظام',
                    subtitle: 'احصل على رؤى زراعية مفيدة في خطوات قليلة.',
                    button: 'جرب طبيب النبات',
                    steps: {
                        upload: { title: 'ارفع صورة للنبات', text: 'اختر صورة واضحة من جهازك أو التقط صورة جديدة باستخدام الكاميرا.' },
                        analysis: { title: 'احصل على تحليل مدعوم بالذكاء الاصطناعي', text: 'راجع المشكلة المحتملة والأعراض الظاهرة ومستوى الثقة والخطوات التالية المقترحة.' },
                        save: { title: 'احفظ النتيجة وتابع التقدم', text: 'احفظ التشخيص وراقب حالة النبات بمرور الوقت.' }
                    }
                },
                about: {
                    eyebrow: 'عن المنصة',
                    title: 'أدوات أذكى لرعاية أفضل للمحاصيل',
                    description: 'تجمع Agricultural Vision Mind بين تشخيص النباتات وتنظيم المزارع وتتبع المحاصيل والإرشاد الزراعي ومعرفة المجتمع والرؤى المفيدة في منصة واحدة.',
                    points: {
                        diagnose: 'شخص مشكلات المحاصيل الظاهرة مبكرا.',
                        organize: 'حافظ على تنظيم المزارع والمهام.',
                        track: 'تابع تغيرات صحة النبات بمرور الوقت.'
                    }
                },
                cta: {
                    title: 'ابدأ إدارة محاصيلك بذكاء أكبر',
                    description: 'استخدم Agricultural Vision Mind لتشخيص مشكلات النباتات ومراقبة مزارعك واتخاذ قرارات أفضل طوال موسم النمو.',
                    primary: 'ابدأ التشخيص',
                    secondary: 'إنشاء حساب'
                }
            }
        },
        agriStore: {
            eyebrow: 'كتالوج خارجي موثوق',
            title: 'المتجر الزراعي',
            subtitle: 'تصفح منتجات زراعية من Harraz Farm & Garden وOrkida. يتم إتمام الشراء على موقع التاجر الأصلي.',
            searchPlaceholder: 'ابحث عن منتجات...',
            sourceLabel: 'مصدر المنتجات',
            allStores: 'كل المتاجر',
            categoryLabel: 'تصنيف المنتج',
            allCategories: 'كل التصنيفات',
            buyNow: 'عرض المنتج',
            sale: 'خصم',
            outOfStock: 'غير متوفر',
            priceUnavailable: 'السعر غير متاح',
            results: '{{count}} منتج',
            catalogReady: 'منتجات من Harraz وOrkida',
            sourceNotice: 'المنتجات والأسعار مقدمة من',
            loadError: 'تعذر تحميل المنتجات',
            retry: 'حاول مرة أخرى',
            noProducts: 'لا توجد منتجات مطابقة',
            noProductsHint: 'جرب كلمة بحث أو تصنيفا مختلفا.',
            previous: 'السابق',
            next: 'التالي',
            pageStatus: 'صفحة {{page}} من {{totalPages}}',
            currentPage: 'صفحة {{page}}'
        },
        timeLapse: {
            title: 'الفاصل الزمني',
            exporting: 'جاري التصدير...',
            success: 'تم حفظ الفاصل الزمني!',
            music: 'تبديل الموسيقى',
            share: 'مشاركة'
        },
        pdf: {
            reportTitle: 'تقرير الرؤية الزراعية الذكية',
            theme: 'المظهر',
            language: 'اللغة',
            print: 'طباعة',
            toggleTheme: 'تبديل الوضع الداكن/الفاتح',
            toggleLang: 'تبديل اللغة'
        }
    }
};
