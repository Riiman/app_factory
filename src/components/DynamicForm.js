import React, { useState } from 'react';
import './DynamicForm.css';

const DynamicForm = ({ schema, initialValues = {}, onSave }) => {
  const [formData, setFormData] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      console.error('Error saving form:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const { name, label, type, required, options, placeholder } = field;
    const value = formData[name] || '';

    switch (type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <input
            type={type}
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            placeholder={placeholder}
            required={required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            placeholder={placeholder}
            required={required}
            rows={4}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(name, parseFloat(e.target.value))}
            placeholder={placeholder}
            required={required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            required={required}
          >
            <option value="">Select...</option>
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            required={required}
          />
        );

      case 'tags':
        return (
          <input
            type="text"
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => handleChange(name, e.target.value.split(',').map(t => t.trim()))}
            placeholder="Comma-separated tags"
          />
        );

      default:
        return <input type="text" value={value} onChange={(e) => handleChange(name, e.target.value)} />;
    }
  };

  if (!schema || !schema.fields) {
    return (
      <div className="empty-state">
        <p>No form schema available for this stage.</p>
      </div>
    );
  }

  return (
    <form className="dynamic-form" onSubmit={handleSubmit}>
      {schema.fields.map(field => (
        <div key={field.name} className="form-field">
          <label>
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          {renderField(field)}
          {field.help && <span className="field-help">{field.help}</span>}
        </div>
      ))}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default DynamicForm;
