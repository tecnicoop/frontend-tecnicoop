/**
 * Gemini Service
 * Servicio para conectar y usar la API de Google Gemini
 * 
 * IMPORTANTE: En producción, esta llamada debe realizarse desde un backend
 * para evitar exponer la API Key en el cliente.
 */

class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.isAvailable = !!apiKey && apiKey !== 'AIzaSyDummyKeyForDevelopmentOnly123456789';
  }

  /**
   * Valida los datos de registro usando Gemini
   * @param {Object} userData - Datos del usuario { name, email, password }
   * @returns {Promise<Object>} Validación y sugerencias
   */
  async validateSignupData(userData) {
    if (!this.isAvailable) {
      console.warn('Gemini Service: API Key no configurada. Usando validación local.');
      return this.validateLocal(userData);
    }

    try {
      const prompt = `
Eres un validador de registros de usuario para una plataforma de cooperativa de servicios.
Valida los siguientes datos de registro y proporciona retroalimentación:

Nombre: ${userData.name}
Email: ${userData.email}

Por favor responde en JSON con este formato exacto:
{
  "isValid": boolean,
  "issues": [string],
  "suggestions": [string],
  "message": string
}

Considera:
- ¿Es un nombre válido y apropiado?
- ¿Es un email válido?
- ¿Hay alguna bandera de seguridad?
`;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        console.error('Error en Gemini API:', response.status);
        return this.validateLocal(userData);
      }

      const data = await response.json();
      const content = data.candidates[0]?.content?.parts[0]?.text || '';
      
      // Intentar parsear la respuesta como JSON
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('No se pudo parsear respuesta de Gemini');
      }

      return this.validateLocal(userData);
    } catch (error) {
      console.error('Error conectando con Gemini:', error);
      return this.validateLocal(userData);
    }
  }

  /**
   * Validación local (fallback)
   */
  validateLocal(userData) {
    const issues = [];
    const suggestions = [];

    // Validar nombre
    if (!userData.name || userData.name.length < 3) {
      issues.push('El nombre debe tener al menos 3 caracteres');
    }
    if (userData.name && userData.name.length > 100) {
      issues.push('El nombre es demasiado largo');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      issues.push('El email no es válido');
    }

    // Sugerencias
    if (userData.name) {
      suggestions.push('✓ El nombre se ve bien');
    }
    if (userData.email && emailRegex.test(userData.email)) {
      suggestions.push('✓ Email válido');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
      message: issues.length === 0 
        ? 'Datos válidos. Puedes continuar con el registro.'
        : 'Por favor corrige los siguientes errores.'
    };
  }

  /**
   * Genera un mensaje de bienvenida personalizado
   */
  async generateWelcomeMessage(userName) {
    if (!this.isAvailable) {
      return `¡Bienvenido ${userName}! Tu cuenta ha sido creada exitosamente.`;
    }

    try {
      const prompt = `Genera un mensaje de bienvenida breve y amigable para un usuario llamado "${userName}" que acaba de registrarse en una plataforma cooperativa de servicios. El mensaje debe ser en español, máximo 2 oraciones.`;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        return `¡Bienvenido ${userName}! Tu cuenta ha sido creada exitosamente.`;
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || `¡Bienvenido ${userName}!`;
    } catch (error) {
      console.error('Error generando mensaje:', error);
      return `¡Bienvenido ${userName}! Tu cuenta ha sido creada exitosamente.`;
    }
  }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiService;
}
