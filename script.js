let uploadedFiles = [];
        
        // Configure PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // File upload handling
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.getElementById('fileInput');
        
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
        
        function handleFiles(files) {
            uploadedFiles = Array.from(files).filter(file => file.type === 'application/pdf');
            
            if (uploadedFiles.length === 0) {
                alert('Please select PDF files only.');
                return;
            }
            
            document.querySelector('.upload-text').textContent = 
                `${uploadedFiles.length} PDF file(s) selected`;
        }
        
        // Keyword management
        function getKeywords(type) {
            const container = document.getElementById(type + 'Keywords');
            const tags = container.querySelectorAll('.tag');
            return Array.from(tags).map(tag => 
                tag.textContent.replace('×', '').trim().toLowerCase()
            );
        }
        
        function addKeyword(type) {
            const input = document.getElementById(type + 'KeywordInput');
            const keyword = input.value.trim().toLowerCase();
            
            if (!keyword) return;
            
            const container = document.getElementById(type + 'Keywords');
            const existingKeywords = getKeywords(type);
            
            if (existingKeywords.includes(keyword)) {
                alert('Keyword already exists!');
                return;
            }
            
            const tagClass = type === 'voice' ? 'voice' : 'network';
            const tag = document.createElement('span');
            tag.className = `tag ${tagClass}`;
            tag.innerHTML = `${keyword} <span class="remove-tag" onclick="removeKeyword(this, '${type}')">×</span>`;
            
            container.appendChild(tag);
            input.value = '';
        }
        
        function removeKeyword(element, type) {
            element.parentElement.remove();
        }
        
        // Add keyword on Enter key
        document.getElementById('voiceKeywordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addKeyword('voice');
        });
        
        document.getElementById('networkKeywordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addKeyword('network');
        });
        
        // PDF processing
        async function extractTextFromPDF(file) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + ' ';
            }
            
            return fullText;
        }
        
        function categorizeInvoice(text, voiceKeywords, networkKeywords) {
            const lowerText = text.toLowerCase();
            
            const voiceMatches = [];
            const networkMatches = [];
            
            voiceKeywords.forEach(keyword => {
                if (lowerText.includes(keyword)) {
                    voiceMatches.push(keyword);
                }
            });
            
            networkKeywords.forEach(keyword => {
                if (lowerText.includes(keyword)) {
                    networkMatches.push(keyword);
                }
            });
            
            // Determine category based on matches
            let category;
            if (voiceMatches.length > 0 && networkMatches.length > 0) {
                category = 'both';
            } else if (voiceMatches.length > 0) {
                category = 'voice';
            } else if (networkMatches.length > 0) {
                category = 'network';
            } else {
                category = 'unknown';
            }
            
            return {
                category,
                voiceMatches,
                networkMatches,
                totalMatches: voiceMatches.length + networkMatches.length
            };
        }
        
        async function processFiles() {
            if (uploadedFiles.length === 0) {
                alert('Please select PDF files first.');
                return;
            }
            
            const loading = document.getElementById('loading');
            const results = document.getElementById('results');
            const resultsList = document.getElementById('resultsList');
            
            loading.style.display = 'block';
            results.style.display = 'none';
            resultsList.innerHTML = '';
            
            const voiceKeywords = getKeywords('voice');
            const networkKeywords = getKeywords('network');
            
            const processedResults = [];
            
            try {
                for (let i = 0; i < uploadedFiles.length; i++) {
                    const file = uploadedFiles[i];
                    const text = await extractTextFromPDF(file);
                    const analysis = categorizeInvoice(text, voiceKeywords, networkKeywords);
                    
                    processedResults.push({
                        filename: file.name,
                        ...analysis
                    });
                }
                
                // Display results
                displayResults(processedResults);
                
            } catch (error) {
                console.error('Error processing files:', error);
                alert('Error processing PDF files. Please try again.');
            } finally {
                loading.style.display = 'none';
            }
        }
        
        function displayResults(results) {
            const resultsList = document.getElementById('resultsList');
            const resultsContainer = document.getElementById('results');
            
            resultsList.innerHTML = '';
            
            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = `result-item ${result.category}`;
                
                const matchesText = [];
                if (result.voiceMatches.length > 0) {
                    matchesText.push(`Voice: ${result.voiceMatches.join(', ')}`);
                }
                if (result.networkMatches.length > 0) {
                    matchesText.push(`Network: ${result.networkMatches.join(', ')}`);
                }
                
                const categoryLabels = {
                    voice: 'Voice Communication',
                    network: 'Network/Internet',
                    both: 'Voice & Network',
                    unknown: 'Uncategorized'
                };
                
                resultItem.innerHTML = `
                    <div class="result-header">
                        <div class="filename">${result.filename}</div>
                        <div class="category-badge ${result.category}">
                            ${categoryLabels[result.category]}
                        </div>
                    </div>
                    <div class="matches">
                        ${matchesText.length > 0 ? 
                            `Keyword matches: ${matchesText.join(' | ')}` : 
                            'No keyword matches found'
                        }
                    </div>
                `;
                
                resultsList.appendChild(resultItem);
            });
            
            resultsContainer.style.display = 'block';
        }