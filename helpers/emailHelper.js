const imaps = require('imap-simple');

class EmailHelper {
  constructor() {
    this.config = {
      imap: {
        user: process.env.EMAIL_USER || 'your@email.com',
        password: process.env.EMAIL_PASSWORD || 'your_password',
        host: process.env.EMAIL_HOST || 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      }
    };
    
    // Проверка что переменные окружения загружены
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('WARNING: EMAIL_USER or EMAIL_PASSWORD not set in environment variables');
    }
  }

  async connect(folder = 'INBOX') {
    this.connection = await imaps.connect(this.config);
    await this.connection.openBox(folder);
    this.currentFolder = folder;
  }
  
  async switchFolder(folder) {
    await this.connection.openBox(folder);
    this.currentFolder = folder;
  }

  async disconnect() {
    if (this.connection) {
      this.connection.end();
    }
  }

  async getVerificationCode(recipient, maxWaitTime = 30000, senderEmail = 'info@crewsforge.com', sentAfter = null) {
    const startTime = Date.now();
    
    // Пробуем стандартные названия папок (в правильном порядке для Gmail на русском)
    const folders = ['[Gmail]/Спам', 'INBOX', '[Gmail]/Spam', 'Spam', 'Junk'];
    
    let attempt = 0;
    while (Date.now() - startTime < maxWaitTime) {
      attempt++;
      console.log(`\n=== Attempt ${attempt} ===`);
      
      // Проверяем все возможные папки
      for (const folder of folders) {
        try {
          await this.switchFolder(folder);
          console.log(`Searching in folder: ${folder}`);
          
          // Пробуем разные варианты поиска (от самого строгого к самому мягкому)
          const searchVariants = [
            // Вариант 1: непрочитанные от отправителя к получателю
            {
              criteria: ['UNSEEN', ['FROM', senderEmail], ['TO', recipient]],
              name: 'UNSEEN + FROM + TO'
            },
            // Вариант 2: непрочитанные от отправителя (без TO)
            {
              criteria: ['UNSEEN', ['FROM', senderEmail]],
              name: 'UNSEEN + FROM'
            },
            // Вариант 3: все письма за последние 5 минут (самые свежие)
            {
              criteria: [['FROM', senderEmail], ['TO', recipient], ['SINCE', new Date(Date.now() - 5 * 60 * 1000)]],
              name: 'FROM + TO (last 5 min)'
            },
            // Вариант 4: все от отправителя за последний час
            {
              criteria: [['FROM', senderEmail], ['SINCE', new Date(Date.now() - 60 * 60 * 1000)]],
              name: 'FROM (last hour)'
            }
          ];

          for (const variant of searchVariants) {
            console.log(`  Trying: ${variant.name}`);
            
            try {
              const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: false
              };

              const messages = await this.connection.search(variant.criteria, fetchOptions);

              if (messages.length > 0) {
                console.log(`  ✓ Found ${messages.length} message(s)`);
                
                // Сортируем по дате и берем ПОСЛЕДНЕЕ письмо
                messages.sort((a, b) => {
                  const dateA = a.attributes.date || new Date(0);
                  const dateB = b.attributes.date || new Date(0);
                  return dateB - dateA;
                });
                
                // Берем только письма не старше 2 минут
                const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
                const recentMessages = messages.filter(msg => {
                  const msgDate = msg.attributes.date;
                  return msgDate && msgDate >= twoMinutesAgo;
                });
                
                if (recentMessages.length === 0) {
                  console.log(`  ✗ No messages found in last 2 minutes (oldest: ${messages[0].attributes.date?.toLocaleTimeString()})`);
                  continue;
                }
                
                console.log(`  ✓ ${recentMessages.length} recent message(s) (last 2 min)`);
                
                // Фильтруем по дате если указано sentAfter
                let messagesToCheck = recentMessages;
                if (sentAfter) {
                  messagesToCheck = recentMessages.filter(msg => {
                    const msgDate = msg.attributes.date;
                    return msgDate && msgDate >= sentAfter;
                  });
                  
                  if (messagesToCheck.length === 0) {
                    console.log(`  No messages found after ${sentAfter.toISOString()}`);
                    continue;
                  }
                  console.log(`  ${messagesToCheck.length} message(s) after ${sentAfter.toLocaleTimeString()}`);
                }
                
                const lastMessage = messagesToCheck[0];
                
                // Показываем информацию о письме
                const header = lastMessage.parts.find(p => p.which === 'HEADER');
                if (header) {
                  console.log(`  From: ${header.body.from?.[0] || 'unknown'}`);
                  console.log(`  To: ${header.body.to?.[0] || 'unknown'}`);
                  console.log(`  Subject: ${header.body.subject?.[0] || 'no subject'}`);
                  console.log(`  Date: ${lastMessage.attributes.date || 'unknown'}`);
                }
                
                const text = this.getEmailBody(lastMessage);
                console.log(`  Body length: ${text.length} chars`);
                console.log(`  Body preview: ${text.substring(0, 300)}`);
                
                // Ищем код в письме
                const code = this.extractCode(text);
                
                if (code) {
                  console.log(`\n✅ Code found: ${code}\n`);
                  
                  // Отмечаем письмо как прочитанное
                  try {
                    const uid = lastMessage.attributes.uid;
                    await this.connection.imap.addFlags(uid, ['\\Seen'], (err) => {
                      if (!err) {
                        console.log('Email marked as read');
                      }
                    });
                  } catch (flagError) {
                    console.log('Note: Could not mark email as read (not critical)');
                  }
                  
                  return code;
                } else {
                  console.log(`  ✗ No code found in this message`);
                }
              } else {
                console.log(`  No messages found`);
              }
            } catch (searchError) {
              console.log(`  Search error: ${searchError.message}`);
            }
          }
        } catch (error) {
          console.log(`  Cannot access folder ${folder}: ${error.message}`);
          continue;
        }
      }

      // Ждем 3 секунды перед следующей попыткой
      console.log('No code found yet, waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error(`Verification code not found within ${maxWaitTime}ms`);
  }

  getEmailBody(message) {
    let body = '';
    
    // Пробуем получить TEXT часть
    const textPart = message.parts.find(part => part.which === 'TEXT');
    if (textPart && textPart.body) {
      body += textPart.body;
    }
    
    // Если TEXT пустой, пробуем получить из пустого which (полное тело)
    const fullPart = message.parts.find(part => part.which === '');
    if (fullPart && fullPart.body) {
      body += fullPart.body;
    }
    
    // Декодируем quoted-printable
    body = this.decodeQuotedPrintable(body);
    
    // Удаляем HTML теги для более чистого поиска
    body = this.stripHtml(body);
    
    // ВАЖНО: Убираем email headers (все после Delivered-To, Received и т.д.)
    const headerStart = body.search(/Delivered-To:|Received:|X-Google-Smtp-Source:/i);
    if (headerStart > 0) {
      body = body.substring(0, headerStart);
    }
    
    return body;
  }

  decodeQuotedPrintable(text) {
    // Декодирование quoted-printable (=3D -> =, =0A -> \n и т.д.)
    return text
      .replace(/=3D/g, '=')
      .replace(/=0A/g, '\n')
      .replace(/=0D/g, '\r')
      .replace(/=([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  stripHtml(html) {
    // Убираем HTML теги но сохраняем текст
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractCode(text) {
    // Паттерны для поиска кодов подтверждения (в порядке приоритета)
    const patterns = [
      // 1. Ищем код сразу после "below:" или "below :"
      /verification\s+code\s+below\s*:?\s*([A-Z0-9]{6})\b/i,
      /code\s+below\s*:?\s*([A-Z0-9]{6})\b/i,
      
      // 2. Ищем код после "below" в пределах 50 символов
      /below\s*:?\s*([A-Z0-9]{6})\b/i,
      
      // 3. Ищем 6 символов (буквы и цифры) - как Y2A9VC
      /\b([A-Z0-9]{6})\b/,
      
      // 4. Другие варианты
      /verification\s+code[:\s]+([A-Z0-9]{6})\b/i,
      /your\s+code[:\s]+([A-Z0-9]{4,8})/i,
      /confirm\s+code[:\s]+([A-Z0-9]{4,8})/i,
      /\b([A-Z]{6})\b/,  // 6 заглавных букв
      /\b(\d{4,6})\b/    // 4-6 цифр
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
      
      for (const match of matches) {
        if (match && match[1]) {
          const code = match[1];
          
          // Фильтруем служебные слова и технические термины
          const excludeWords = [
            'below', 'above', 'button', 'click', 'email', 'verification', 
            'DOCTYPE', 'BLACKFRI', 'ESMTPS', 'SMTP', 'Gmail', 'Google',
            'Received', 'AGHT', 'PST', 'UTF'
          ];
          
          const isExcluded = excludeWords.some(word => 
            code.toLowerCase().includes(word.toLowerCase()) || 
            code === word.toUpperCase()
          );
          
          if (!isExcluded) {
            return code;
          }
        }
      }
    }

    return null;
  }

  async deleteAllEmails() {
    try {
      const searchCriteria = ['ALL'];
      const fetchOptions = { bodies: [''] };
      
      const messages = await this.connection.search(searchCriteria, fetchOptions);
      
      if (messages.length > 0) {
        const uids = messages.map(msg => msg.attributes.uid);
        await this.connection.addFlags(uids, '\\Deleted');
        await this.connection.imap.expunge();
      }
    } catch (error) {
      console.error('Error deleting emails:', error);
    }
  }

  async listAllFolders() {
    try {
      // Правильный метод для imap-simple
      const boxes = await this.connection.getBoxes();
      const folderList = this.flattenBoxes(boxes);
      console.log('Available folders:', folderList);
      return folderList;
    } catch (error) {
      console.log('Cannot list folders automatically, trying common names');
      // Если не получается получить список, возвращаем стандартные названия
      return ['INBOX', '[Gmail]/Spam', '[Gmail]/Спам', 'Spam', 'Junk'];
    }
  }

  flattenBoxes(boxes, prefix = '') {
    let folders = [];
    for (const [name, box] of Object.entries(boxes)) {
      const fullName = prefix ? `${prefix}/${name}` : name;
      folders.push(fullName);
      if (box.children) {
        folders = folders.concat(this.flattenBoxes(box.children, fullName));
      }
    }
    return folders;
  }
}

module.exports = EmailHelper;