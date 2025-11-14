import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class ResumeAnalysisService {
    constructor() {
        this.pdfcoApiKey = process.env.PDFCO_API_KEY;
        this.pdfcoBaseUrl = 'https://api.pdf.co/v1';
        
        this.defaultWeights = {
            skills: 30,
            experience: 25,
            education: 15,
            certifications: 10,
            projects: 10,
            achievements: 5,
            internships: 5
        };
        
        this.certificationKeywords = [
            'aws', 'azure', 'gcp', 'google cloud', 'certified', 'certification',
            'cisco', 'ccna', 'ccnp', 'comptia', 'oracle', 'microsoft', 'java',
            'python', 'pmp', 'agile', 'scrum', 'itil', 'cissp', 'ceh',
            'docker', 'kubernetes', 'redhat', 'linux', 'vmware', 'salesforce'
        ];
        
        this.projectKeywords = [
            'project', 'developed', 'built', 'created', 'implemented', 'designed',
            'application', 'system', 'platform', 'website', 'mobile', 'web',
            'api', 'database', 'frontend', 'backend', 'fullstack', 'microservices'
        ];
        
        this.achievementKeywords = [
            'award', 'winner', 'first', 'best', 'top', 'achieved', 'recognition',
            'honor', 'excellence', 'outstanding', 'performance', 'scholarship',
            'medal', 'prize', 'rank', 'percentile', 'distinction'
        ];
        
        this.internshipKeywords = [
            'intern', 'internship', 'trainee', 'training', 'apprentice',
            'co-op', 'placement', 'summer', 'winter'
        ];
        
        this.skillPatterns = [
            'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 'node.js',
            'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'gcp', 'docker',
            'kubernetes', 'git', 'html', 'css', 'typescript', 'spring', 'django',
            'flask', 'express', 'graphql', 'rest api', 'jenkins', 'ci/cd', 'agile',
            'scrum', 'machine learning', 'data science', 'tensorflow', 'pytorch',
            'pandas', 'numpy', 'redis', 'kafka', 'microservices', 'api', 'json'
        ];

        this.roleSkillMap = {
            'software developer': {
                critical: ['javascript', 'python', 'java', 'react', 'angular', 'nodejs', 'sql', 'git', 'api', 'rest api'],
                important: ['typescript', 'html', 'css', 'spring', 'django', 'express', 'graphql', 'agile', 'scrum'],
                boost: 25
            },
            'frontend developer': {
                critical: ['javascript', 'react', 'angular', 'vue', 'html', 'css', 'typescript'],
                important: ['ui', 'ux', 'responsive design', 'webpack', 'npm', 'git', 'rest api', 'figma'],
                boost: 25
            },
            'backend developer': {
                critical: ['python', 'java', 'nodejs', 'sql', 'api', 'rest api', 'database', 'spring', 'django'],
                important: ['graphql', 'microservices', 'mongodb', 'postgresql', 'docker', 'kubernetes', 'agile', 'redis'],
                boost: 25
            },
            'full stack developer': {
                critical: ['javascript', 'react', 'nodejs', 'sql', 'mongodb', 'html', 'css', 'api'],
                important: ['python', 'angular', 'vue', 'express', 'django', 'docker', 'git', 'agile', 'typescript'],
                boost: 20
            },
            'mern developer': {
                critical: ['javascript', 'react', 'nodejs', 'mongodb', 'express', 'html', 'css'],
                important: ['typescript', 'api', 'git', 'agile', 'rest api', 'redux', 'npm'],
                boost: 25
            },
            'mean developer': {
                critical: ['javascript', 'angular', 'nodejs', 'mongodb', 'express', 'typescript'],
                important: ['rxjs', 'api', 'git', 'agile', 'rest api', 'npm', 'html', 'css'],
                boost: 25
            },
            'java developer': {
                critical: ['java', 'spring', 'sql', 'api', 'rest api', 'maven', 'git'],
                important: ['spring boot', 'hibernate', 'microservices', 'docker', 'jenkins', 'agile', 'junit'],
                boost: 25
            },
            'python developer': {
                critical: ['python', 'django', 'flask', 'sql', 'git', 'api', 'rest api'],
                important: ['fastapi', 'celery', 'postgresql', 'mongodb', 'docker', 'agile', 'pytest'],
                boost: 25
            },
            'nodejs developer': {
                critical: ['nodejs', 'javascript', 'express', 'sql', 'mongodb', 'api', 'rest api'],
                important: ['typescript', 'graphql', 'docker', 'redis', 'git', 'agile', 'npm'],
                boost: 25
            },
            'devops engineer': {
                critical: ['docker', 'kubernetes', 'jenkins', 'ci/cd', 'aws', 'git', 'linux', 'bash'],
                important: ['ansible', 'terraform', 'python', 'shell scripting', 'microservices', 'monitoring', 'prometheus'],
                boost: 25
            },
            'cloud engineer': {
                critical: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'linux', 'networking'],
                important: ['terraform', 'ci/cd', 'security', 'database', 'microservices', 'monitoring'],
                boost: 25
            },
            'cloud architect': {
                critical: ['aws', 'azure', 'gcp', 'architecture', 'kubernetes', 'microservices', 'networking'],
                important: ['docker', 'security', 'scalability', 'database design', 'disaster recovery', 'compliance'],
                boost: 25
            },
            'aws engineer': {
                critical: ['aws', 'ec2', 's3', 'lambda', 'docker', 'ci/cd', 'linux'],
                important: ['terraform', 'rds', 'dynamodb', 'vpc', 'iam', 'cloudformation', 'monitoring'],
                boost: 25
            },
            'azure engineer': {
                critical: ['azure', 'vm', 'app service', 'docker', 'ci/cd', 'kubernetes'],
                important: ['terraform', 'cosmos db', 'sql database', 'service fabric', 'devops', 'monitoring'],
                boost: 25
            },
            'infrastructure engineer': {
                critical: ['linux', 'networking', 'docker', 'kubernetes', 'ci/cd', 'ansible', 'terraform'],
                important: ['aws', 'azure', 'gcp', 'monitoring', 'security', 'bash', 'python'],
                boost: 25
            },
            'site reliability engineer': {
                critical: ['linux', 'docker', 'kubernetes', 'monitoring', 'ci/cd', 'bash', 'python'],
                important: ['terraform', 'ansible', 'aws', 'gcp', 'prometheus', 'grafana', 'scripting'],
                boost: 25
            },
            'data scientist': {
                critical: ['python', 'machine learning', 'tensorflow', 'pandas', 'numpy', 'sql', 'data analysis'],
                important: ['pytorch', 'scikit-learn', 'r', 'statistics', 'visualization', 'deep learning', 'jupyter'],
                boost: 25
            },
            'machine learning engineer': {
                critical: ['python', 'machine learning', 'tensorflow', 'pytorch', 'sql', 'numpy', 'pandas'],
                important: ['keras', 'scikit-learn', 'deep learning', 'nlp', 'computer vision', 'data preprocessing'],
                boost: 25
            },
            'data engineer': {
                critical: ['python', 'sql', 'spark', 'hadoop', 'etl', 'data warehousing', 'git'],
                important: ['kafka', 'scala', 'hive', 'airflow', 'docker', 'aws', 'mongodb'],
                boost: 25
            },
            'data analyst': {
                critical: ['sql', 'python', 'data analysis', 'visualization', 'excel', 'tableau', 'power bi'],
                important: ['r', 'statistics', 'business intelligence', 'looker', 'git', 'database'],
                boost: 25
            },
            'analytics engineer': {
                critical: ['sql', 'python', 'data transformation', 'dbt', 'analytics', 'data warehousing'],
                important: ['tableau', 'looker', 'airflow', 'git', 'business intelligence', 'visualization'],
                boost: 25
            },
            'big data engineer': {
                critical: ['spark', 'hadoop', 'scala', 'python', 'sql', 'hive', 'etl'],
                important: ['kafka', 'cassandra', 'nosql', 'data warehousing', 'docker', 'git'],
                boost: 25
            },
            'qa engineer': {
                critical: ['testing', 'automation', 'selenium', 'java', 'python', 'api testing', 'bug tracking'],
                important: ['ci/cd', 'docker', 'agile', 'jira', 'performance testing', 'manual testing', 'junit'],
                boost: 20
            },
            'automation engineer': {
                critical: ['automation', 'selenium', 'python', 'java', 'testing', 'api testing', 'ci/cd'],
                important: ['appium', 'cucumber', 'agile', 'jira', 'git', 'performance', 'docker'],
                boost: 25
            },
            'test automation engineer': {
                critical: ['selenium', 'python', 'java', 'automation', 'testing', 'git', 'ci/cd'],
                important: ['api testing', 'rest assured', 'cucumber', 'junit', 'testng', 'agile'],
                boost: 25
            },
            'performance engineer': {
                critical: ['performance testing', 'jmeter', 'loadrunner', 'testing', 'sql', 'analysis'],
                important: ['automation', 'scripting', 'python', 'monitoring', 'optimization', 'linux'],
                boost: 20
            },
            'android developer': {
                critical: ['android', 'java', 'kotlin', 'xml', 'api', 'git', 'rest api'],
                important: ['jetpack', 'firebase', 'sqlite', 'retrofit', 'agile', 'junit', 'espresso'],
                boost: 25
            },
            'ios developer': {
                critical: ['ios', 'swift', 'objective-c', 'xcode', 'api', 'git', 'rest api'],
                important: ['cocoapods', 'firebase', 'coredata', 'alamofire', 'agile', 'unittest'],
                boost: 25
            },
            'mobile developer': {
                critical: ['react native', 'flutter', 'javascript', 'api', 'git', 'rest api'],
                important: ['firebase', 'redux', 'testing', 'agile', 'npm', 'android', 'ios'],
                boost: 25
            },
            'react native developer': {
                critical: ['react native', 'javascript', 'react', 'api', 'git', 'rest api'],
                important: ['redux', 'firebase', 'testing', 'npm', 'agile', 'typescript'],
                boost: 25
            },
            'flutter developer': {
                critical: ['flutter', 'dart', 'api', 'git', 'firebase', 'rest api'],
                important: ['bloc', 'provider', 'testing', 'agile', 'async', 'mobile'],
                boost: 25
            },
            'web developer': {
                critical: ['html', 'css', 'javascript', 'react', 'angular', 'nodejs', 'api'],
                important: ['typescript', 'vue', 'express', 'django', 'git', 'responsive design'],
                boost: 25
            },
            'ui developer': {
                critical: ['html', 'css', 'javascript', 'ui design', 'responsive design', 'git'],
                important: ['react', 'vue', 'figma', 'accessibility', 'web performance', 'npm'],
                boost: 25
            },
            'ux designer': {
                critical: ['ux design', 'figma', 'ui design', 'prototyping', 'user research', 'wireframing'],
                important: ['adobe xd', 'sketch', 'html', 'css', 'accessibility', 'design systems'],
                boost: 20
            },
            'database administrator': {
                critical: ['sql', 'database', 'postgresql', 'mysql', 'backup', 'recovery', 'linux'],
                important: ['mongodb', 'oracle', 'performance tuning', 'indexing', 'security', 'replication'],
                boost: 25
            },
            'database engineer': {
                critical: ['sql', 'database design', 'postgresql', 'mysql', 'optimization', 'git'],
                important: ['mongodb', 'redis', 'nosql', 'data warehousing', 'replication', 'indexing'],
                boost: 25
            },
            'systems engineer': {
                critical: ['linux', 'windows', 'networking', 'security', 'infrastructure', 'bash'],
                important: ['automation', 'python', 'monitoring', 'virtualization', 'docker', 'troubleshooting'],
                boost: 25
            },
            'security engineer': {
                critical: ['security', 'networking', 'linux', 'encryption', 'firewalls', 'penetration testing'],
                important: ['python', 'bash', 'vulnerability assessment', 'compliance', 'monitoring'],
                boost: 25
            },
            'cybersecurity analyst': {
                critical: ['cybersecurity', 'networking', 'encryption', 'threat analysis', 'linux'],
                important: ['python', 'security tools', 'compliance', 'incident response', 'monitoring'],
                boost: 25
            },
            'penetration tester': {
                critical: ['penetration testing', 'networking', 'linux', 'security tools', 'python'],
                important: ['metasploit', 'vulnerability scanning', 'scripting', 'encryption', 'analysis'],
                boost: 25
            },
            'network administrator': {
                critical: ['networking', 'tcp/ip', 'firewalls', 'cisco', 'linux', 'windows'],
                important: ['routing', 'switching', 'dns', 'dhcp', 'vpn', 'monitoring', 'troubleshooting'],
                boost: 20
            },
            'network engineer': {
                critical: ['networking', 'tcp/ip', 'cisco', 'routing', 'switching', 'linux'],
                important: ['firewalls', 'vpn', 'sd-wan', 'automation', 'python', 'ansible'],
                boost: 25
            },
            'system administrator': {
                critical: ['linux', 'windows', 'system administration', 'scripting', 'bash', 'networking'],
                important: ['active directory', 'group policy', 'backup', 'security', 'monitoring', 'troubleshooting'],
                boost: 20
            },
            'business analyst': {
                critical: ['business analysis', 'requirements gathering', 'documentation', 'sql', 'excel'],
                important: ['agile', 'jira', 'visio', 'process improvement', 'communication', 'powerpoint'],
                boost: 20
            },
            'product manager': {
                critical: ['product management', 'strategy', 'requirements', 'roadmapping', 'analytics'],
                important: ['agile', 'jira', 'data analysis', 'user research', 'communication'],
                boost: 20
            },
            'project manager': {
                critical: ['project management', 'agile', 'scrum', 'planning', 'communication'],
                important: ['jira', 'waterfall', 'risk management', 'budget', 'leadership', 'documentation'],
                boost: 20
            },
            'scrum master': {
                critical: ['scrum', 'agile', 'sprint management', 'teamwork', 'communication'],
                important: ['jira', 'kanban', 'coaching', 'conflict resolution', 'facilitation'],
                boost: 20
            },
            'solutions architect': {
                critical: ['architecture', 'system design', 'aws', 'azure', 'gcp', 'microservices'],
                important: ['docker', 'kubernetes', 'database design', 'networking', 'security', 'scalability'],
                boost: 25
            },
            'customer success manager': {
                critical: ['customer success', 'communication', 'problem solving', 'crm', 'sales'],
                important: ['technical knowledge', 'training', 'documentation', 'agile', 'data analysis'],
                boost: 15
            },
            'technical support engineer': {
                critical: ['technical support', 'troubleshooting', 'customer service', 'documentation', 'communication'],
                important: ['linux', 'windows', 'networking', 'database', 'scripting', 'ticketing system'],
                boost: 20
            },
            'release manager': {
                critical: ['release management', 'ci/cd', 'deployment', 'git', 'documentation'],
                important: ['agile', 'automation', 'testing', 'monitoring', 'version control', 'troubleshooting'],
                boost: 20
            },
            'artificial intelligence engineer': {
                critical: ['artificial intelligence', 'machine learning', 'python', 'tensorflow', 'neural networks'],
                important: ['nlp', 'computer vision', 'deep learning', 'pytorch', 'numpy', 'pandas'],
                boost: 25
            },
            'nlp engineer': {
                critical: ['nlp', 'python', 'machine learning', 'tensorflow', 'transformers', 'nlp models'],
                important: ['pytorch', 'bert', 'gpt', 'text processing', 'deep learning', 'spacy'],
                boost: 25
            },
            'computer vision engineer': {
                critical: ['computer vision', 'python', 'tensorflow', 'opencv', 'image processing'],
                important: ['pytorch', 'deep learning', 'convolutional neural networks', 'object detection'],
                boost: 25
            },
            'blockchain developer': {
                critical: ['blockchain', 'solidity', 'smart contracts', 'ethereum', 'web3', 'javascript'],
                important: ['cryptography', 'distributed systems', 'git', 'api', 'testing'],
                boost: 25
            },
            'graphic designer': {
                critical: ['graphic design', 'adobe creative suite', 'figma', 'ui design', 'visual design'],
                important: ['photoshop', 'illustrator', 'indesign', 'prototyping', 'web design', 'animation'],
                boost: 20
            },
            'technical writer': {
                critical: ['technical writing', 'documentation', 'communication', 'api documentation', 'markdown'],
                important: ['git', 'cms', 'tools like confluence', 'html', 'diagrams', 'editing'],
                boost: 15
            },
            'devrel engineer': {
                critical: ['developer relations', 'technical communication', 'api', 'documentation', 'public speaking'],
                important: ['coding', 'git', 'community management', 'content creation', 'technical knowledge'],
                boost: 20
            },
            'qa automation engineer': {
                critical: ['automation', 'selenium', 'python', 'java', 'testing', 'api testing'],
                important: ['ci/cd', 'docker', 'agile', 'git', 'junit', 'performance testing'],
                boost: 25
            }
        };
        
        if (!this.pdfcoApiKey) {
            console.warn('PDFCO_API_KEY not found in environment variables');
            console.warn('Get your free API key from: https://app.pdf.co/signup');
        }
        
        console.log('ResumeAnalysisService initialized with PDF.co');
    }

    async parseResumeFromUrl(resumeUrl) {
        try {
            console.log('Starting resume parsing for URL:', resumeUrl);
            
            if (!this.pdfcoApiKey) {
                throw new Error('PDF.co API key not configured. Get free key from https://app.pdf.co/signup');
            }

            if (!resumeUrl || !resumeUrl.trim()) {
                throw new Error('Resume URL is required');
            }

            if (!this.isValidUrl(resumeUrl)) {
                throw new Error('Invalid resume URL format');
            }

            const extractedText = await this.extractTextFromDocument(resumeUrl);
            const parsedData = this.parseResumeText(extractedText);
            
            console.log('Resume parsing completed successfully');
            return parsedData;
            
        } catch (error) {
            console.error('Resume parsing error:', error.message);
            return this.createErrorResponse(error.message);
        }
    }

    async extractTextFromDocument(documentUrl) {
        try {
            console.log('Extracting text from document using PDF.co...');
            
            const endpoint = `${this.pdfcoBaseUrl}/pdf/convert/to/text`;
            
            const requestBody = {
                url: documentUrl,
                async: false,
                inline: true,
                pages: "",
                name: "result.txt"
            };

            console.log('Sending request to PDF.co API...');
            
            const response = await axios.post(endpoint, requestBody, {
                headers: {
                    'x-api-key': this.pdfcoApiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            console.log('PDF.co API response status:', response.status);

            if (!response.data || response.data.error) {
                const errorMsg = response.data?.message || 'PDF.co extraction failed';
                throw new Error(errorMsg);
            }

            let extractedText = '';
            
            if (response.data.body) {
                extractedText = response.data.body;
                console.log('Text extracted inline, length:', extractedText.length);
            } 
            else if (response.data.url) {
                console.log('Fetching extracted text from URL...');
                const textResponse = await axios.get(response.data.url, {
                    timeout: 30000
                });
                extractedText = textResponse.data;
                console.log('Text fetched from URL, length:', extractedText.length);
            }
            else {
                throw new Error('No text content in PDF.co response');
            }

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('Extracted text is empty');
            }

            console.log('Text extraction successful');
            return extractedText;
            
        } catch (error) {
            console.error('PDF.co extraction error:', error.message);
            
            if (error.response?.status === 401) {
                throw new Error('Invalid PDF.co API key. Check your PDFCO_API_KEY in .env file');
            } else if (error.response?.status === 402) {
                throw new Error('PDF.co credits exhausted. Visit https://app.pdf.co/ to add credits');
            } else if (error.response?.status === 400) {
                throw new Error('Bad request to PDF.co. The PDF URL might be invalid or inaccessible');
            }
            
            throw new Error(`Text extraction failed: ${error.message}`);
        }
    }

    parseResumeText(text) {
        try {
            console.log('Parsing extracted text...');
            
            const lowerText = text.toLowerCase();
            
            const name = this.extractName(text);
            const email = this.extractEmail(text);
            const phone = this.extractPhone(text);
            const workExperience = this.extractWorkExperience(text);
            const educationData = this.extractEducation(text);
            const skills = this.extractSkills(text);
            
            const certificationKeywords = this.extractKeywords(lowerText, this.certificationKeywords);
            const achievementKeywords = this.extractKeywords(lowerText, this.achievementKeywords);
            const projectKeywords = this.extractKeywords(lowerText, this.projectKeywords);
            const internshipKeywords = this.extractKeywords(lowerText, this.internshipKeywords);
            
            const parsed = {
                name: name,
                email: email,
                phone: phone,
                workExperience: workExperience,
                education: educationData.qualifications,
                cgpa: educationData.cgpa,
                skills: skills,
                certificationKeywords: certificationKeywords,
                achievementKeywords: achievementKeywords,
                projectKeywords: projectKeywords,
                internshipKeywords: internshipKeywords,
                parseStatus: 'SUCCESS',
                error: null,
                parsedAt: new Date(),
                source: 'pdf.co'
            };

            console.log('Parsing completed:', {
                name: parsed.name,
                email: parsed.email,
                workExperience: parsed.workExperience,
                skillsCount: parsed.skills.length,
                educationCount: parsed.education.length
            });
            
            return parsed;
            
        } catch (error) {
            console.error('Text parsing error:', error);
            return this.createErrorResponse(error.message);
        }
    }

    extractName(text) {
        const lines = text.split('\n').filter(line => line.trim());
        
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();
            
            if (line.match(/@|phone|email|resume|curriculum|vitae|tel:|mobile:/i)) {
                continue;
            }
            
            const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
            if (nameMatch) {
                return nameMatch[1];
            }
        }
        
        for (const line of lines.slice(0, 3)) {
            if (line.length > 3 && line.length < 50 && !line.includes('@') && !line.match(/\d{3,}/)) {
                return line.trim();
            }
        }
        
        return '';
    }

    extractEmail(text) {
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return emailMatch ? emailMatch[0] : '';
    }

    extractPhone(text) {
        const phonePatterns = [
            /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
            /(\+?\d{1,3}[-.\s]?)?\d{10}/,
            /(\+91[-.\s]?)?\d{10}/
        ];
        
        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0].trim();
            }
        }
        
        return '';
    }

    extractWorkExperience(text) {
        const expPatterns = [
            /(\d+\.?\d*)\s*(?:\+)?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i,
            /experience[:\s]+(\d+\.?\d*)\s*(?:\+)?\s*(?:years?|yrs?)/i,
            /(?:total\s+)?(?:work\s+)?experience[:\s]+(\d+\.?\d*)/i
        ];
        
        for (const pattern of expPatterns) {
            const match = text.match(pattern);
            if (match) {
                return parseFloat(match[1]);
            }
        }
        
        const jobIndicators = text.match(/(?:worked|employed|position|role|job)\s+(?:at|with|for)/gi);
        if (jobIndicators && jobIndicators.length > 0) {
            return jobIndicators.length * 1.5;
        }
        
        return 0;
    }

    extractEducation(text) {
        const qualifications = [];
        let cgpa = '';
        
        const lowerText = text.toLowerCase();
        
        if (lowerText.match(/\b(?:10th|tenth|sslc|matriculation)\b/)) {
            qualifications.push('10th');
        }
        if (lowerText.match(/\b(?:12th|twelfth|hsc|intermediate|higher secondary)\b/)) {
            qualifications.push('12th');
        }
        if (lowerText.match(/\b(?:b\.?tech|bachelor.*technology|btech|be|b\.e\.?)\b/)) {
            qualifications.push('B.Tech');
        }
        if (lowerText.match(/\b(?:m\.?tech|master.*technology|mtech|me|m\.e\.?)\b/)) {
            qualifications.push('M.Tech');
        }
        if (lowerText.match(/\b(?:mba|master.*business|m\.b\.a\.?)\b/)) {
            qualifications.push('MBA');
        }
        if (lowerText.match(/\b(?:phd|ph\.d|doctorate|doctoral)\b/)) {
            qualifications.push('PhD');
        }
        if (lowerText.match(/\b(?:bachelor|b\.a|b\.sc|b\.com)\b/) && qualifications.length === 0) {
            qualifications.push('Bachelor');
        }
        
        const cgpaMatch = text.match(/(?:cgpa|gpa|grade)[:\s]+(\d+\.?\d*)/i);
        if (cgpaMatch) {
            cgpa = cgpaMatch[1];
        } else {
            const percentMatch = text.match(/(\d{2,3})(?:\.\d+)?%/);
            if (percentMatch) {
                cgpa = percentMatch[1];
            }
        }
        
        return {
            qualifications: [...new Set(qualifications)],
            cgpa: cgpa
        };
    }

    extractSkills(text) {
        const skills = [];
        const lowerText = text.toLowerCase();
        
        const skillSectionMatch = text.match(/(?:skills?|technical skills?|core competencies)[:\s]+([\s\S]+?)(?:\n\n|education|experience|projects?|$)/i);
        
        let skillText = skillSectionMatch ? skillSectionMatch[1] : text;
        
        this.skillPatterns.forEach(skill => {
            const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(lowerText)) {
                skills.push(skill);
            }
        });
        
        const bulletMatches = skillText.match(/[•·\-]\s*([^\n•·\-]+)/g);
        if (bulletMatches) {
            bulletMatches.forEach(match => {
                const cleanMatch = match.replace(/^[•·\-]\s*/, '').trim();
                if (cleanMatch.length > 2 && cleanMatch.length < 30 && !cleanMatch.match(/\d{4}/)) {
                    skills.push(cleanMatch);
                }
            });
        }
        
        const commaSkills = skillText.split(/[,;|\n]/);
        commaSkills.forEach(skill => {
            const trimmed = skill.trim();
            if (trimmed.length > 2 && trimmed.length < 30 && !trimmed.match(/\d{4}|experience|education/i)) {
                skills.push(trimmed);
            }
        });
        
        return [...new Set(skills)].slice(0, 30);
    }

    extractKeywords(text, keywords) {
        const found = [];
        
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(text)) {
                found.push(keyword);
            }
        });
        
        return [...new Set(found)];
    }

    extractJobRole(jobTitle) {
        const title = jobTitle.toLowerCase().trim();
        
        for (const role of Object.keys(this.roleSkillMap)) {
            if (title.includes(role)) {
                return role;
            }
        }
        
        return null;
    }

    scoreSkillsWithRoleMatch(resume, jobData) {
        const requiredSkills = jobData.requiredSkills || [];
        const preferredSkills = jobData.preferredSkills || [];
        const resumeSkills = resume.skills || [];
        const jobRole = this.extractJobRole(jobData.title);
        
        if (requiredSkills.length === 0 && preferredSkills.length === 0) {
            return resumeSkills.length > 0 ? 70 : 30;
        }
        
        const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
        
        const requiredMatches = requiredSkills.filter(skill => 
            resumeSkillsLower.some(rs => rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs))
        ).length;
        
        const preferredMatches = preferredSkills.filter(skill => 
            resumeSkillsLower.some(rs => rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs))
        ).length;
        
        let baseScore = 0;
        baseScore += requiredSkills.length > 0 ? (requiredMatches / requiredSkills.length) * 70 : 70;
        baseScore += preferredSkills.length > 0 ? (preferredMatches / preferredSkills.length) * 30 : 30;
        
        if (jobRole && this.roleSkillMap[jobRole]) {
            const roleConfig = this.roleSkillMap[jobRole];
            const criticalSkills = roleConfig.critical;
            const importantSkills = roleConfig.important;
            
            const matchedCritical = criticalSkills.filter(skill =>
                resumeSkillsLower.some(rs => rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs))
            ).length;
            
            const matchedImportant = importantSkills.filter(skill =>
                resumeSkillsLower.some(rs => rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs))
            ).length;
            
            const criticalCoverage = criticalSkills.length > 0 ? matchedCritical / criticalSkills.length : 0;
            const importantCoverage = importantSkills.length > 0 ? matchedImportant / importantSkills.length : 0;
            
            let boost = 0;
            if (criticalCoverage >= 0.8) {
                boost += roleConfig.boost * 0.9;
            } else if (criticalCoverage >= 0.7) {
                boost += roleConfig.boost * 0.8;
            } else if (criticalCoverage >= 0.5) {
                boost += roleConfig.boost * 0.5;
            } else if (criticalCoverage >= 0.3) {
                boost += roleConfig.boost * 0.25;
            }
            
            if (importantCoverage >= 0.7) {
                boost += roleConfig.boost * 0.35;
            } else if (importantCoverage >= 0.5) {
                boost += roleConfig.boost * 0.2;
            } else if (importantCoverage >= 0.3) {
                boost += roleConfig.boost * 0.1;
            }
            
            baseScore = Math.min(100, baseScore + boost);
            
            console.log(`Role-specific boost applied for ${jobRole}:`, {
                baseScore: Math.round(baseScore - boost),
                boost: Math.round(boost),
                finalScore: Math.round(baseScore),
                criticalMatch: `${Math.round(criticalCoverage * 100)}%`,
                importantMatch: `${Math.round(importantCoverage * 100)}%`,
                matchedCritical: `${matchedCritical}/${criticalSkills.length}`,
                matchedImportant: `${matchedImportant}/${importantSkills.length}`
            });
        }
        
        return Math.round(baseScore);
    }

    scoreExperienceEnhanced(resume, jobData) {
        const requiredExp = jobData.minExperience || 0;
        const preferredExp = jobData.preferredExperience || requiredExp;
        const candidateExp = resume.workExperience || 0;
        
        if (requiredExp === 0) {
            return candidateExp > 0 ? 80 : 60;
        }
        
        if (candidateExp === 0) {
            return requiredExp <= 1 ? 40 : 20;
        }
        
        if (candidateExp >= preferredExp) {
            return 100;
        } 
        else if (candidateExp >= requiredExp) {
            const diff = preferredExp - requiredExp || 1;
            const score = 75 + ((candidateExp - requiredExp) / diff) * 25;
            return Math.round(score);
        } 
        else {
            const score = (candidateExp / requiredExp) * 75;
            return Math.round(Math.min(75, score));
        }
    }

    scoreCertificationsEnhanced(resume, jobData) {
        const certKeywords = resume.certificationKeywords || [];
        const jobCerts = jobData.preferredCertifications || [];
        
        if (certKeywords.length === 0) {
            return jobCerts.length > 0 ? 40 : 60;
        }
        
        if (jobCerts.length === 0) {
            if (certKeywords.length >= 5) return 100;
            if (certKeywords.length >= 3) return 85;
            if (certKeywords.length >= 1) return 70;
            return 60;
        }
        
        const matches = jobCerts.filter(cert => 
            certKeywords.some(ck => ck.toLowerCase().includes(cert.toLowerCase()) || 
                                   cert.toLowerCase().includes(ck.toLowerCase()))
        ).length;
        
        const matchScore = (matches / jobCerts.length) * 75;
        const volumeScore = Math.min(certKeywords.length * 8, 25);
        
        return Math.round(matchScore + volumeScore);
    }

    scoreProjectsEnhanced(resume, jobData) {
        const projectKeywords = resume.projectKeywords || [];
        
        if (projectKeywords.length === 0) return 45;
        if (projectKeywords.length >= 10) return 100;
        if (projectKeywords.length >= 8) return 95;
        if (projectKeywords.length >= 6) return 85;
        if (projectKeywords.length >= 4) return 75;
        if (projectKeywords.length >= 2) return 65;
        if (projectKeywords.length >= 1) return 55;
        
        return 50;
    }

    scoreEducation(resume, jobData) {
        const requiredEducation = jobData.requiredEducation || [];
        const candidateEducation = resume.education || [];
        
        if (requiredEducation.length === 0) {
            return candidateEducation.length > 0 ? 80 : 50;
        }
        
        const eduMap = {
            '10th': 1, '12th': 2, 'Diploma': 3,
            'B.Tech': 4, 'Bachelor': 4,
            'M.Tech': 5, 'Master': 5, 'MBA': 5,
            'PhD': 6, 'Doctorate': 6
        };
        
        const getHighestLevel = (eduList) => {
            return Math.max(...eduList.map(e => eduMap[e] || 0), 0);
        };
        
        const requiredLevel = getHighestLevel(requiredEducation);
        const candidateLevel = getHighestLevel(candidateEducation);
        
        if (candidateLevel >= requiredLevel) {
            const cgpa = parseFloat(resume.cgpa) || 0;
            let baseScore = 85;
            if (cgpa >= 8.5) baseScore = 100;
            else if (cgpa >= 7.5) baseScore = 95;
            else if (cgpa >= 6.5) baseScore = 90;
            return baseScore;
        } else {
            const score = (candidateLevel / requiredLevel) * 70;
            return Math.round(score);
        }
    }

    scoreAchievements(resume, jobData) {
        const achievementKeywords = resume.achievementKeywords || [];
        
        if (achievementKeywords.length === 0) return 40;
        if (achievementKeywords.length >= 5) return 100;
        if (achievementKeywords.length >= 4) return 90;
        if (achievementKeywords.length >= 3) return 80;
        if (achievementKeywords.length >= 2) return 70;
        if (achievementKeywords.length >= 1) return 60;
        
        return 50;
    }

    scoreInternships(resume, jobData) {
        const internshipKeywords = resume.internshipKeywords || [];
        const hasInternships = internshipKeywords.length > 0;
        
        if (!hasInternships) {
            return resume.workExperience > 0 ? 70 : 40;
        }
        
        if (internshipKeywords.length >= 3) return 95;
        if (internshipKeywords.length >= 2) return 85;
        if (internshipKeywords.length >= 1) return 75;
        
        return 70;
    }

    getMatchedSkills(resume, jobData) {
        const requiredSkills = jobData.requiredSkills || [];
        const preferredSkills = jobData.preferredSkills || [];
        const allJobSkills = [...requiredSkills, ...preferredSkills];
        const resumeSkills = resume.skills || [];
        
        const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
        
        return allJobSkills.filter(skill => 
            resumeSkillsLower.some(rs => 
                rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs)
            )
        );
    }

    getMissingSkills(resume, jobData) {
        const requiredSkills = jobData.requiredSkills || [];
        const resumeSkills = resume.skills || [];
        
        const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
        
        return requiredSkills.filter(skill => 
            !resumeSkillsLower.some(rs => 
                rs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs)
            )
        );
    }

    identifyStrengths(scores) {
        const strengths = [];
        
        Object.entries(scores).forEach(([category, score]) => {
            if (score >= 80) {
                strengths.push({
                    category: this.formatCategoryName(category),
                    score: score,
                    message: this.getStrengthMessage(category, score)
                });
            }
        });
        
        return strengths.sort((a, b) => b.score - a.score);
    }

    identifyWeaknesses(scores) {
        const weaknesses = [];
        
        Object.entries(scores).forEach(([category, score]) => {
            if (score < 60) {
                weaknesses.push({
                    category: this.formatCategoryName(category),
                    score: score,
                    message: this.getWeaknessMessage(category, score)
                });
            }
        });
        
        return weaknesses.sort((a, b) => a.score - b.score);
    }

    generateRecommendations(scores, resume, jobData) {
        const recommendations = [];
        
        if (scores.skills < 70) {
            const missingSkills = this.getMissingSkills(resume, jobData);
            if (missingSkills.length > 0) {
                recommendations.push({
                    priority: 'HIGH',
                    category: 'Skills',
                    message: `Acquire or highlight these key skills: ${missingSkills.slice(0, 5).join(', ')}`
                });
            }
        }
        
        if (scores.experience < 70) {
            const requiredExp = jobData.minExperience || 0;
            const candidateExp = resume.workExperience || 0;
            if (candidateExp < requiredExp) {
                recommendations.push({
                    priority: 'HIGH',
                    category: 'Experience',
                    message: `Gain ${requiredExp - candidateExp} more years of relevant experience`
                });
            }
        }
        
        if (scores.certifications < 60) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Certifications',
                message: 'Consider obtaining relevant industry certifications'
            });
        }
        
        if (scores.projects < 60) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Projects',
                message: 'Add more project details to showcase practical experience'
            });
        }
        
        return recommendations;
    }

    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    getStrengthMessage(category, score) {
        const messages = {
            skills: 'Strong technical skill set matching job requirements',
            experience: 'Excellent work experience alignment',
            education: 'Educational qualifications exceed requirements',
            certifications: 'Impressive professional certifications',
            projects: 'Strong project portfolio',
            achievements: 'Notable achievements',
            internships: 'Valuable internship experience'
        };
        return messages[category] || 'Strong performance';
    }

    getWeaknessMessage(category, score) {
        const messages = {
            skills: 'Skill set needs improvement',
            experience: 'Work experience below requirements',
            education: 'Educational qualifications need enhancement',
            certifications: 'Limited certifications',
            projects: 'Project portfolio needs strengthening',
            achievements: 'Few achievements highlighted',
            internships: 'Limited internship experience'
        };
        return messages[category] || 'Needs improvement';
    }

    async scoreResumeEnhanced(parsedResume, jobData, customWeights = null) {
        try {
            console.log('Starting enhanced resume scoring with role awareness...');
            
            if (parsedResume.parseStatus === 'ERROR') {
                return this.createErrorScore('Resume parsing failed');
            }
            
            const weights = customWeights || this.defaultWeights;
            
            const scores = {
                skills: this.scoreSkillsWithRoleMatch(parsedResume, jobData),
                experience: this.scoreExperienceEnhanced(parsedResume, jobData),
                education: this.scoreEducation(parsedResume, jobData),
                certifications: this.scoreCertificationsEnhanced(parsedResume, jobData),
                projects: this.scoreProjectsEnhanced(parsedResume, jobData),
                achievements: this.scoreAchievements(parsedResume, jobData),
                internships: this.scoreInternships(parsedResume, jobData)
            };
            
            let totalScore = 0;
            let totalWeight = 0;
            
            Object.keys(scores).forEach(category => {
                if (weights[category]) {
                    totalScore += scores[category] * weights[category];
                    totalWeight += weights[category];
                }
            });
            
            const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
            
            const result = {
                overallScore: finalScore,
                categoryScores: scores,
                weights: weights,
                recommendations: this.generateRecommendations(scores, parsedResume, jobData),
                matchedSkills: this.getMatchedSkills(parsedResume, jobData),
                missingSkills: this.getMissingSkills(parsedResume, jobData),
                strengths: this.identifyStrengths(scores),
                weaknesses: this.identifyWeaknesses(scores),
                scoredAt: new Date()
            };
            
            console.log('Enhanced scoring completed:', {
                overallScore: result.overallScore,
                jobRole: this.extractJobRole(jobData.title),
                breakdown: scores
            });
            
            return result;
            
        } catch (error) {
            console.error('Resume scoring error:', error);
            return this.createErrorScore(error.message);
        }
    }

    createErrorResponse(errorMessage) {
        return {
            name: '',
            email: '',
            phone: '',
            workExperience: 0,
            education: [],
            cgpa: '',
            skills: [],
            certificationKeywords: [],
            achievementKeywords: [],
            projectKeywords: [],
            internshipKeywords: [],
            parseStatus: 'ERROR',
            error: errorMessage,
            parsedAt: new Date(),
            source: 'pdf.co'
        };
    }

    createErrorScore(errorMessage) {
        return {
            overallScore: 0,
            categoryScores: {
                skills: 0,
                experience: 0,
                education: 0,
                certifications: 0,
                projects: 0,
                achievements: 0,
                internships: 0
            },
            weights: this.defaultWeights,
            recommendations: [{
                priority: 'HIGH',
                category: 'Error',
                message: errorMessage
            }],
            matchedSkills: [],
            missingSkills: [],
            strengths: [],
            weaknesses: [],
            error: errorMessage,
            scoredAt: new Date()
        };
    }

    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }
}

export default ResumeAnalysisService;