/**
 * Elmoorx v4 — Forms Library
 * ===========================
 * مكتبة نماذج متكاملة:
 *   - reactive form state
 *   - validation (sync + async)
 *   - field-level + form-level validation
 *   - custom validators
 *   - touch/dirty tracking
 *   - submit handling
 *   - error messages
 *   - field arrays (dynamic forms)
 */

import { h, $state, $computed, $effect, $batch } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) FORM BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export function createForm(config) {
  const {
    initialValues = {},
    validators = {},
    asyncValidators = {},
    onSubmit,
    validateOn = 'blur', // 'change' | 'blur' | 'submit'
  } = config;

  // state
  const values = $state(structuredClone(initialValues));
  const errors = $state({});
  const touched = $state({});
  const dirty = $state({});
  const submitting = $state(false);
  const submitCount = $state(0);

  // computed
  const isValid = $computed(() => Object.keys(errors()).length === 0);
  const isDirty = $computed(() => Object.keys(dirty()).length > 0);

  // ─── Field operations ───
  function setValue(name, value) {
    values.set(v => ({ ...v, [name]: value }));
    dirty.set(d => ({ ...d, [name]: true }));

    if (validateOn === 'change') {
      validateField(name);
    }
  }

  function setTouched(name) {
    touched.set(t => ({ ...t, [name]: true }));
    if (validateOn === 'blur') {
      validateField(name);
    }
  }

  function getValue(name) {
    return values()[name];
  }

  function getError(name) {
    return errors()[name];
  }

  function isTouched(name) {
    return !!touched()[name];
  }

  function isFieldDirty(name) {
    return !!dirty()[name];
  }

  // ─── Validation ───
  function validateField(name) {
    const validator = validators[name];
    if (!validator) return;

    const value = values()[name];
    const result = validator(value, values());

    errors.set(e => {
      const newErrors = { ...e };
      if (result) newErrors[name] = result;
      else delete newErrors[name];
      return newErrors;
    });
  }

  async function validateFieldAsync(name) {
    const asyncValidator = asyncValidators[name];
    if (!asyncValidator) return;

    const value = values()[name];
    try {
      const result = await asyncValidator(value, values());
      errors.set(e => {
        const newErrors = { ...e };
        if (result) newErrors[name] = result;
        else delete newErrors[name];
        return newErrors;
      });
    } catch (err) {
      errors.set(e => ({ ...e, [name]: err.message }));
    }
  }

  function validateAll() {
    for (const name of Object.keys(validators)) {
      validateField(name);
    }
    return isValid();
  }

  async function validateAllAsync() {
    validateAll();
    await Promise.all(Object.keys(asyncValidators).map(validateFieldAsync));
    return isValid();
  }

  // ─── Submit ───
  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    submitCount.set(c => c + 1);

    // المس جميع الحقول
    const allTouched = {};
    for (const key of Object.keys(values())) allTouched[key] = true;
    touched.set(allTouched);

    // تحقق من الكل
    const valid = await validateAllAsync();
    if (!valid) return { success: false, errors: errors() };

    // نفّذ onSubmit
    submitting.set(true);
    try {
      const result = onSubmit ? await onSubmit(values()) : null;
      return { success: true, values: values(), result };
    } catch (err) {
      return { success: false, error: err };
    } finally {
      submitting.set(false);
    }
  }

  // ─── Reset ───
  function reset(newValues) {
    values.set(structuredClone(newValues || initialValues));
    errors.set({});
    touched.set({});
    dirty.set({});
    submitCount.set(0);
  }

  // ─── Field arrays (dynamic) ───
  function appendField(name, value) {
    values.set(v => ({ ...v, [name]: [...(v[name] || []), value] }));
  }

  function removeField(name, index) {
    values.set(v => {
      const arr = [...(v[name] || [])];
      arr.splice(index, 1);
      return { ...v, [name]: arr };
    });
  }

  function moveField(name, from, to) {
    values.set(v => {
      const arr = [...(v[name] || [])];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...v, [name]: arr };
    });
  }

  // ─── Helper to bind field ───
  function field(name) {
    return {
      name,
      value: values()[name] ?? '',
      onInput: (e) => {
        const val = e.target?.value ?? e;
        setValue(name, val);
      },
      onChange: (e) => {
        const val = e.target?.value ?? e;
        setValue(name, val);
      },
      onBlur: () => setTouched(name),
      error: getError(name),
      touched: isTouched(name),
      dirty: isFieldDirty(name),
    };
  }

  return {
    values,
    errors,
    touched,
    dirty,
    submitting,
    submitCount,
    isValid,
    isDirty,
    setValue,
    getValue,
    setTouched,
    getError,
    validateField,
    validateFieldAsync,
    validateAll,
    validateAllAsync,
    handleSubmit,
    reset,
    appendField,
    removeField,
    moveField,
    field,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) VALIDATORS جاهزة
// ─────────────────────────────────────────────────────────────────────────────

export const validators = {
  required: (msg = 'هذا الحقل مطلوب') => (v) => {
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return msg;
    return null;
  },

  minLength: (n, msg) => (v) => {
    if (!v || v.length < n) return msg || `يجب أن يكون ${n} أحرف على الأقل`;
    return null;
  },

  maxLength: (n, msg) => (v) => {
    if (v && v.length > n) return msg || `يجب أن يكون ${n} أحرف على الأكثر`;
    return null;
  },

  email: (msg = 'بريد إلكتروني غير صالح') => (v) => {
    if (!v) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return msg;
    return null;
  },

  url: (msg = 'رابط غير صالح') => (v) => {
    if (!v) return null;
    try { new URL(v); return null; } catch { return msg; }
  },

  number: (msg = 'يجب أن يكون رقماً') => (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (isNaN(Number(v))) return msg;
    return null;
  },

  min: (n, msg) => (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (Number(v) < n) return msg || `يجب أن يكون ${n} على الأقل`;
    return null;
  },

  max: (n, msg) => (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (Number(v) > n) return msg || `يجب أن يكون ${n} على الأكثر`;
    return null;
  },

  pattern: (regex, msg = 'القيمة غير صالحة') => (v) => {
    if (!v) return null;
    if (!regex.test(v)) return msg;
    return null;
  },

  matches: (otherField, msg = 'القيمتان غير متطابقتين') => (v, allValues) => {
    if (v !== allValues[otherField]) return msg;
    return null;
  },

  compose: (...validators) => (v, allValues) => {
    for (const validator of validators) {
      const error = validator(v, allValues);
      if (error) return error;
    }
    return null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3) FORM COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Form(props) {
  const {
    form,
    onSubmit,
    children,
    ...rest
  } = props;

  return h('form', {
    onSubmit: form.handleSubmit,
    ...rest,
  }, children);
}

export function Field(props) {
  const {
    form,
    name,
    label,
    type = 'text',
    placeholder,
    component = 'input',
    ...rest
  } = props;

  const fieldProps = form.field(name);
  const error = fieldProps.error;

  return h('div', { style: 'margin-bottom:1rem;' },
    label && h('label', {
      style: 'display:block;color:#94a3b8;margin-bottom:0.25rem;font-size:0.9rem;',
    }, label),
    h(component, {
      type,
      name,
      placeholder,
      value: fieldProps.value,
      onInput: fieldProps.onInput,
      onBlur: fieldProps.onBlur,
      style: error
        ? 'width:100%;padding:0.5rem;background:#0f172a;border:1px solid #ef4444;border-radius:4px;color:white;'
        : 'width:100%;padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:4px;color:white;',
      ...rest,
    }),
    error && fieldProps.touched && h('div', {
      style: 'color:#ef4444;font-size:0.85rem;margin-top:0.25rem;',
    }, error),
  );
}

export function SubmitButton(props) {
  const { form, children, ...rest } = props;
  return h('button', {
    type: 'submit',
    disabled: form.submitting() || !form.isValid(),
    style: 'padding:0.75rem 1.5rem;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;font-size:1rem;disabled:opacity:0.5;',
    ...rest,
  }, form.submitting() ? 'جاري الإرسال...' : children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useForm(config) {
  return createForm(config);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  createForm,
  useForm,
  validators,
  Form,
  Field,
  SubmitButton,
};
