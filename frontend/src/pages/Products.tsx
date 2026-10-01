import { FormEvent, useEffect, useState } from 'react';
import { api, apiError } from '../api/client';
import { PRODUCT_CATEGORIES, categoryLabel, formatCurrency } from '../lib/constants';

type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number | string;
  category: string;
  imageUrl?: string;
  available?: boolean;
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<Product[]>('/products');
      setProducts(data);
      setError('');
    } catch (e) {
      setError(apiError(e, 'Falha ao carregar os produtos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Produtos</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ Novo produto</button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : products.length === 0 ? (
        <p className="text-slate-500">Nenhum produto cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="mb-3 h-40 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 flex h-40 w-full items-center justify-center rounded-lg bg-slate-100 text-4xl">🍰</div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-800">{p.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.available === false ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {p.available === false ? 'Indisponível' : 'Disponível'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{categoryLabel(p.category)}</p>
              {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="font-bold text-brand-700">{formatCurrency(p.price)}</span>
                <button className="btn-ghost" onClick={() => setEditing(p)}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <ProductModal
          title="Novo produto"
          requireImage
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
          onSubmit={(form) => api.post('/products', form)}
        />
      )}

      {editing && (
        <ProductModal
          title={`Editar: ${editing.name}`}
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onSubmit={(form) => api.patch(`/products/${editing.id}`, form)}
        />
      )}
    </div>
  );
}

function ProductModal({
  title,
  product,
  requireImage,
  onClose,
  onSaved,
  onSubmit,
}: {
  title: string;
  product?: Product;
  requireImage?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSubmit: (form: FormData) => Promise<unknown>;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [category, setCategory] = useState(product?.category ?? PRODUCT_CATEGORIES[0].value);
  const [available, setAvailable] = useState(product?.available !== false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!product;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!isEdit && !file) {
      setError('A foto do produto é obrigatória.');
      return;
    }
    const form = new FormData();
    if (!isEdit) form.append('name', name);
    if (description !== '') form.append('description', description);
    if (price !== '') form.append('price', price);
    form.append('category', category);
    if (isEdit) form.append('available', String(available));
    if (file) form.append('file', file);

    setSaving(true);
    try {
      await onSubmit(form);
      onSaved();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar o produto.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        )}

        {!isEdit && (
          <div className="mb-3">
            <label className="label">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}

        <div className="mb-3">
          <label className="label">Descrição</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label">Preço (R$)</label>
            <input className="input" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {isEdit && (
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            Disponível no cardápio
          </label>
        )}

        <div className="mb-5">
          <label className="label">Foto {requireImage ? '(obrigatória)' : '(opcional — troca a atual)'}</label>
          <input
            className="input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
