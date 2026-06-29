import React from 'react';

/**
 * Admin input for the `copyable-link` custom field.
 *
 * Renders the (read-only) link plus a one-click "Copy link" button. Self-contained
 * — no @strapi/design-system imports — so it can't break across design-system
 * versions. The value is set server-side (lifecycle), so this input is display-only.
 */
const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '0.75rem', fontWeight: 600, color: '#32324d' },
  row: { display: 'flex', gap: '8px', alignItems: 'stretch' },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '8px 12px',
    border: '1px solid #dcdce4',
    borderRadius: '4px',
    background: '#f6f6f9',
    color: '#32324d',
    fontSize: '0.875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  button: (disabled) => ({
    padding: '8px 14px',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#dcdce4' : '#4945ff',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }),
  hint: { fontSize: '0.75rem', color: '#666687' },
};

const CopyableLinkInput = React.forwardRef((props, ref) => {
  const { name, value, label, hint, required } = props;
  const link = value || '';
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch (err) {
      // Fallback for browsers/contexts without the async clipboard API.
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div ref={ref} style={styles.wrap}>
      <span style={styles.label}>
        {label || 'Share link'}
        {required ? ' *' : ''}
      </span>
      <div style={styles.row}>
        <input
          name={name}
          readOnly
          value={link}
          placeholder="(generated automatically after you save)"
          onFocus={(e) => e.target.select()}
          style={styles.input}
        />
        <button type="button" onClick={copy} disabled={!link} style={styles.button(!link)}>
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>
      {hint ? <span style={styles.hint}>{hint}</span> : null}
    </div>
  );
});

CopyableLinkInput.displayName = 'CopyableLinkInput';

export default CopyableLinkInput;
