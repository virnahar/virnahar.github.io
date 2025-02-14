const chatData = {
    about: "Hi! I'm Virendra Kumar, a seasoned DevOps Architect with a passion for driving technical evolution and fostering innovation. With over 10 years of experience, I specialize in system architecture, cloud technologies, and automation. Currently working as a Senior Cloud DevOps Engineer at McKinsey & Company, I focus on driving cost optimization, harnessing the power of AI for intelligent automation, and building high-performing teams.",
    
    experience: `Here's my professional experience:
  
  - **Senior Cloud DevOps Engineer at McKinsey & Company** (November 2024 - Present)
    - Leading the development of high-quality products through DevOps methodologies
    - Spearheading numerous cost-saving initiatives through streamlined processes and automation
    - Achieved savings of ~$100K through innovative solutions
    - Architecting multiple products to meet diverse business needs and enhance operational efficiency
    - Implementing AI solutions to enhance productivity and drive business growth
    - Championing automation initiatives to improve workflow efficiency and reduce manual effort
    - Collaborating with cross-functional teams to deliver impactful solutions that drive business success
  
  - **DevOps Associate Manager at Accenture** (September 2021 - January 2023)
    - Designing and implementing DevOps strategies and solutions
    - Setting up and maintaining CI/CD pipelines using tools such as Jenkins and CloudBees Jenkins
    - Managing infrastructure as code using tools such as Terraform and Ansible
    - Providing technical leadership and guidance to the DevOps team and other stakeholders
    - Identifying opportunities for process improvement and automation
    - Managing and maintaining documentation for all DevOps processes and procedures
  
  - **DevOps Technical Lead at Mercer** (September 2020 - September 2021)
    - Implementation of CI/CD Pipeline using Jenkins, Azure DevOps, ZAP, SonarQube, Nexus, PUMA, Cast Highlight, and DefectDojo Vulnerability Management
    - Assessing, building, and supporting high-quality DevOps processes and operations
    - Collaborating with development and operations teams to ensure smooth and efficient delivery of software products
    - Managing and maintaining documentation for all DevOps processes and procedures
    - Mentoring junior team members and promoting a culture of continuous learning and improvement
  
  - **Module Lead at Mercer** (September 2018 - September 2020)
  
  - **Senior Software Engineer at Mercer** (September 2016 - September 2018)
  
  - **Sr. System Administrator at Clavax** (April 2016 - September 2016)
    - Configuring and managing OnPrem GitLab
    - Working with Hosting Control Panel WHM/Cpanel
    - Writing Bash shell scripts to automate daily tasks
    - Installing and configuring MySQL Server, and performing backups and restores using tools such as MySQL dump
    - Providing technical support and troubleshooting for server and application issues
    - Monitoring server performance and implementing measures to optimize and improve it
    - Providing technical leadership and guidance to team members
  
  - **System Administrator at Clavax** (March 2014 - April 2016)
  
  - **System Engineer at Aannya Softwares Pvt. Ltd.** (April 2013 - February 2014)
    - Managing and maintaining documentation for all system administration processes and procedures
    - Collaborating with the client team to ensure that the installation and configuration meets their needs and aligns with their overall system architecture
    - Providing technical support and guidance to the client team throughout the process`,
  
    skills: `My technical skills include:
  
  - **DevOps Tools**: Kubernetes, Docker, Terraform, Jenkins, Azure DevOps, GitHub, GitLab, Bitbucket, Jira, Confluence, Ansible
  - **Cloud Platforms**: AWS, Azure, IBM Cloud, Oracle Cloud
  - **Programming Languages**: Bash, Python, JavaScript
  - **Other**: CI/CD, Infrastructure as Code, Automation, AI for DevOps`,
  
    projects: `Some of my notable projects:
  
  1. **Cost Optimization Initiative**
     - Achieved savings of ~$100K through innovative solutions
     - Implemented AI solutions to enhance productivity and drive business growth
  
  2. **CI/CD Pipeline Implementation**
     - Designed and implemented CI/CD pipelines using Jenkins, Azure DevOps, and other tools
     - Improved deployment efficiency and reduced manual effort
  
  3. **Cloud Infrastructure Automation**
     - Automated cloud infrastructure management using Terraform and Ansible
     - Enhanced scalability and resilience of cloud solutions`,
  
    contact: `You can reach me through:
  
  - Email: virnahar@gmail.com
  - LinkedIn: linkedin.com/in/virnahar
  - GitHub: github.com/virnahar
  - Portfolio: virnahar.github.io`,
  
    certifications: `Here are some of my certifications:
  
  - **AWS Certified Solutions Architect**
  - **Certified Kubernetes Administrator (CKA)**
  - **Microsoft Certified: Azure Developer Associate**
  - **Operating Kubernetes on IBM Cloud**
  - **Oracle Cloud Infrastructure 2024 Generative AI Professional (1Z0-1127-24)**
  - **Red Hat Certified System Administrator**
  - **Generative AI: Prompt Engineering Basics**
  - **Microsoft Certified: DevOps Engineer Expert**`,
  
    education: `I have the following educational qualifications:
  
  - **Jai Narain Vyas University**
    - Bachelor's Degree, Computer Science · (2009 - 2012)`,
  
    default: "Hello! I'm Virendra's AI assistant. How can I help you today?",
  };

  class ChatUI {
    constructor() {
      this.messages = document.getElementById('messages'); // Ensure this references the correct element
      this.form = document.getElementById('chat-form');
      this.input = document.getElementById('chat-input');
      this.sendButton = document.getElementById('send-button');
      this.newChatButton = document.querySelector('.new-chat');
      this.suggestions = document.querySelectorAll('.suggestion');
  
      this.setupEventListeners();
      this.addMessage('bot', chatData.default);
  
      // Auto-resize textarea
      this.input.addEventListener('input', () => {
        this.updateInputState();
      });
    }
  
    setupEventListeners() {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = this.input.value.trim();
        if (message) {
          this.handleUserMessage(message);
        }
      });
  
      this.newChatButton.addEventListener('click', () => {
        this.clearChat();
        this.addMessage('bot', chatData.default);
      });
  
      // Setup suggestion clicks
      this.suggestions.forEach(suggestion => {
        suggestion.addEventListener('click', () => {
          const prompt = suggestion.dataset.prompt;
          this.input.value = prompt;
          this.updateInputState();
          // We don't call handleUserMessage here, so it won't send automatically
        });
      });
    }
  
    updateInputState() {
      this.input.style.height = 'auto';
      this.input.style.height = this.input.scrollHeight + 'px';
  
      // Enable/disable send button based on input
      const hasContent = this.input.value.trim().length > 0;
      this.sendButton.disabled = !hasContent;
    }
  
    addMessage(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
  
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
  
      if (role === 'bot') {
        avatar.innerHTML = `<img src="avatar.gif" alt="Bot Avatar" width="35" height="35" />`;
      } else {
        avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;
      }
  
      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageContent.innerHTML = marked.parse(content);
  
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(messageContent);
      this.messages.appendChild(messageDiv);
  
      // Scroll smoothly as content loads
      this.autoScroll();
    }
  
    autoScroll() {
      setTimeout(() => {
        if (this.messages) {
          this.messages.scrollTop = this.messages.scrollHeight;
        } else {
          console.error('Messages element not found');
        }
      }, 100); // Add slight delay to ensure content is rendered before scrolling
    }
  
    addTypingIndicator() {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message bot typing-message';
  
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.innerHTML = `<img src="avatar.gif" alt="Bot Avatar" width="20" height="20" />`;
  
      const typing = document.createElement('div');
      typing.className = 'typing';
      typing.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      `;
  
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(typing);
      this.messages.appendChild(messageDiv);
  
      // Smooth scroll to bottom
      this.autoScroll();
  
      return messageDiv;
    }
  
    removeTypingIndicator(element) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      // Smooth scroll to bottom
      this.autoScroll();
    }
  
    clearChat() {
      this.messages.innerHTML = '';
      this.input.value = '';
      this.updateInputState();
    }
  
    async handleUserMessage(message) {
      // Add user message
      this.addMessage('user', message);
  
      // Clear input and disable send button
      this.input.value = '';
      this.updateInputState();
  
      // Add typing indicator
      const typingIndicator = this.addTypingIndicator();
  
      // Process message
      const response = await this.getResponse(message);
  
      // Remove typing indicator and add bot response with typing effect
      setTimeout(() => {
        this.removeTypingIndicator(typingIndicator);
        this.addTypingEffect('bot', response);
      }, 1000);
    }
  
    addTypingEffect(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      // Add appropriate icon based on role
      if (role === 'bot') {
        avatar.innerHTML = `<img src="avatar.gif" alt="Bot Avatar" width="35" height="35" />`;
      } else {
        avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;
      }
      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(messageContent);
      this.messages.appendChild(messageDiv);
  
      // Split content into lines
      const lines = content.split('\n');
      let index = 0;
      const typingSpeed = 30; // Adjust typing speed here
  
      const type = () => {
        if (index < lines.length) {
          const line = lines[index];
          if (line.startsWith('**') && line.endsWith('**')) {
            // Apply typing effect to headings
            let heading = '';
            const typeHeading = (i) => {
              if (i < line.length) {
                heading += line.charAt(i);
                messageContent.innerHTML = marked.parse(heading);
                setTimeout(() => typeHeading(i + 1), typingSpeed);
              } else {
                index++;
                setTimeout(type, typingSpeed);
              }
            };
            typeHeading(0);
          } else {
            // Accumulate content and display it all at once
            let contentBlock = '';
            while (index < lines.length && !(lines[index].startsWith('**') && lines[index].endsWith('**'))) {
              contentBlock += lines[index] + '\n';
              index++;
            }
            messageContent.innerHTML += marked.parse(contentBlock);
            setTimeout(type, typingSpeed);
          }
        } else {
          // Smooth scroll to bottom
          this.autoScroll();
        }
      };
      type();
    }
  
    getResponse(message) {
      return new Promise((resolve) => {
        const lowercaseMessage = message.toLowerCase();
        console.log('Received message:', lowercaseMessage); // Debug log
        let response = '';
  
        if (lowercaseMessage.includes('education')) {
          response = chatData.education;
        } else if (lowercaseMessage.includes('experience')) {
          response = chatData.experience;
        } else if (lowercaseMessage.includes('skills')) {
          response = chatData.skills;
        } else if (lowercaseMessage.includes('projects')) {
          response = chatData.projects;
        } else if (lowercaseMessage.includes('contact')) {
          response = chatData.contact;
        } else if (lowercaseMessage.includes('certifications')) {
          response = chatData.certifications;
        } else if (lowercaseMessage.includes('about')) {
          response = chatData.about;
        } else {
          response = "I can tell you about Virendra's experience, skills, projects, certifications, or provide contact information. What would you like to know?";
        }
  
        console.log('Response:', response); // Debug log
        resolve(response);
      });
    }
  }
  
  // Initialize the chat UI
  const chat = new ChatUI();