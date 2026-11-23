
import { useState } from 'react';
import {
  Bot,
  X,
  Send,
  MessageCircle,
  Sparkles,
  User,
  LoaderCircle
} from 'lucide-react';

export default function MunicipalAssistant({ apiUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am the SmartMunicipality Assistant. I can help you understand how to report municipal problems, submit evidence and use this platform. How can I help you today?',
      suggestions: [
        'How do I report a water leak?',
        'How do I report electricity problems?',
        'Can I upload a photograph?',
        'What information must I provide?'
      ]
    }
  ]);

  async function sendMessage(text = input) {
    const message = text.trim();

    if (!message || loading) return;

    setError('');
    setInput('');

    setMessages(previous => [
      ...previous,
      {
        role: 'user',
        text: message
      }
    ]);

    setLoading(true);

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/ai/assistant/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            message
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Unable to get a response. Please try again.'
        );
      }

      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          text: data.reply || 'Sorry, I could not generate a response.',
          suggestions: data.suggestions || []
        }
      ]);

    } catch (err) {
      setError(
        err.message || 'Could not connect to the assistant.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <>
      <style>{`
        .municipal-chat-launcher {
          position: fixed;
          right: 25px;
          bottom: 25px;
          z-index: 9998;
          width: 62px;
          height: 62px;
          border: none;
          border-radius: 50%;
          background: #173b73;
          color: white;
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(23, 59, 115, .28);
          transition: transform .2s, background .2s;
        }

        .municipal-chat-launcher:hover {
          background: #2457a3;
          transform: translateY(-3px);
        }

        .municipal-chat-window {
          position: fixed;
          z-index: 9999;
          right: 25px;
          bottom: 100px;
          width: min(390px, calc(100vw - 30px));
          height: min(570px, calc(100vh - 125px));
          background: #ffffff;
          border: 1px solid #e3e9f2;
          border-radius: 17px;
          box-shadow: 0 18px 55px rgba(20, 38, 68, .20);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #1c2940;
          font-family: inherit;
        }

        .municipal-chat-header {
          background: #173b73;
          color: white;
          padding: 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .municipal-chat-brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .municipal-chat-avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,.15);
        }

        .municipal-chat-brand strong {
          display: block;
          font-size: 14px;
        }

        .municipal-chat-brand small {
          display: block;
          color: #d8e5f8;
          font-size: 11px;
          margin-top: 4px;
        }

        .municipal-chat-close {
          border: none;
          background: transparent;
          color: white;
          cursor: pointer;
          padding: 5px;
        }

        .municipal-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f7f9fc;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .municipal-chat-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .municipal-chat-row.user {
          justify-content: flex-end;
        }

        .municipal-chat-message {
          max-width: 85%;
          padding: 12px 14px;
          border-radius: 13px;
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .municipal-chat-message.assistant {
          background: white;
          border: 1px solid #e7ebf2;
          border-top-left-radius: 4px;
        }

        .municipal-chat-message.user {
          background: #173b73;
          color: white;
          border-top-right-radius: 4px;
        }

        .municipal-chat-icon {
          flex-shrink: 0;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e8eef9;
          color: #173b73;
        }

        .municipal-chat-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-left: 35px;
          margin-top: -7px;
        }

        .municipal-chat-suggestions button {
          background: white;
          border: 1px solid #cbd8eb;
          color: #2457a3;
          padding: 7px 10px;
          border-radius: 20px;
          font-size: 11px;
          cursor: pointer;
          text-align: left;
        }

        .municipal-chat-suggestions button:hover {
          background: #edf3ff;
        }

        .municipal-chat-typing {
          color: #7b8799;
          font-size: 12px;
          margin-left: 35px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .municipal-chat-error {
          margin: 0 14px 8px;
          padding: 9px 11px;
          border-radius: 8px;
          background: #fff0ed;
          color: #b42332;
          font-size: 12px;
        }

        .municipal-chat-form {
          display: flex;
          gap: 8px;
          padding: 13px;
          border-top: 1px solid #e7ebf2;
          background: white;
        }

        .municipal-chat-form input {
          min-width: 0;
          flex: 1;
          border: 1px solid #dce2ec;
          border-radius: 10px;
          padding: 11px 12px;
          outline: none;
          font: inherit;
          font-size: 13px;
        }

        .municipal-chat-form input:focus {
          border-color: #315fbb;
        }

        .municipal-chat-send {
          width: 43px;
          min-width: 43px;
          border: none;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #173b73;
          color: white;
          cursor: pointer;
        }

        .municipal-chat-send:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .municipal-chat-disclaimer {
          background: white;
          padding: 0 13px 10px;
          text-align: center;
          color: #8793a5;
          font-size: 10px;
        }

        @media (max-width: 480px) {
          .municipal-chat-window {
            right: 10px;
            bottom: 85px;
            width: calc(100vw - 20px);
            height: min(570px, calc(100vh - 105px));
          }

          .municipal-chat-launcher {
            right: 17px;
            bottom: 17px;
          }
        }
      `}</style>

      {isOpen && (
        <section
          className="municipal-chat-window"
          aria-label="SmartMunicipality AI Assistant"
        >
          <header className="municipal-chat-header">
            <div className="municipal-chat-brand">
              <div className="municipal-chat-avatar">
                <Bot size={23} />
              </div>

              <div>
                <strong>SmartMunicipality Assistant</strong>
                <small>
                  <Sparkles size={11} style={{ verticalAlign: 'middle' }} />
                  {' '}Municipal reporting support
                </small>
              </div>
            </div>

            <button
              type="button"
              className="municipal-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              <X size={21} />
            </button>
          </header>

          <div className="municipal-chat-messages">
            {messages.map((item, index) => (
              <div key={index}>
                <div
                  className={`municipal-chat-row ${item.role}`}
                >
                  {item.role === 'assistant' && (
                    <div className="municipal-chat-icon">
                      <Bot size={15} />
                    </div>
                  )}

                  <div
                    className={`municipal-chat-message ${item.role}`}
                  >
                    {item.text}
                  </div>

                  {item.role === 'user' && (
                    <div className="municipal-chat-icon">
                      <User size={15} />
                    </div>
                  )}
                </div>

                {item.role === 'assistant' &&
                  item.suggestions?.length > 0 && (
                    <div className="municipal-chat-suggestions">
                      {item.suggestions.map((suggestion, suggestionIndex) => (
                        <button
                          key={suggestionIndex}
                          type="button"
                          disabled={loading}
                          onClick={() => sendMessage(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {loading && (
              <div className="municipal-chat-typing">
                <LoaderCircle size={15} />
                Assistant is responding...
              </div>
            )}
          </div>

          {error && (
            <div className="municipal-chat-error" role="alert">
              {error}
            </div>
          )}

          <form
            className="municipal-chat-form"
            onSubmit={handleSubmit}
          >
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Ask a municipal question..."
              maxLength={1000}
              disabled={loading}
              aria-label="Message to assistant"
            />

            <button
              type="submit"
              className="municipal-chat-send"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </form>

          <div className="municipal-chat-disclaimer">
            AI assistance only. This is a community prototype, not an
            official municipal emergency service.
          </div>
        </section>
      )}

      <button
        type="button"
        className="municipal-chat-launcher"
        onClick={() => setIsOpen(open => !open)}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
        title="Chat with SmartMunicipality Assistant"
      >
        {isOpen
          ? <X size={25} />
          : <MessageCircle size={27} />
        }
      </button>
    </>
  );
}
