import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PROPERTIES } from './data/mockData';
import './index.css';

function App() {
  const [properties, setProperties] = useState(MOCK_PROPERTIES);
  const [stats, setStats] = useState(null);
  const [maxPrice, setMaxPrice] = useState(3500);
  const [rooms, setRooms] = useState(2);
  const [sortBy, setSortBy] = useState('none');
  const [referenceLocation, setReferenceLocation] = useState('Dr. Ivo Reck, 55');
  const [maxDistance, setMaxDistance] = useState(20);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/search?maxPrice=${maxPrice}&rooms=${rooms}`);
      if (!response.ok) throw new Error('Falha no Servidor ou Cloudflare Block');
      
      const data = await response.json();
      setProperties(data.properties || []);
      setStats(data.stats || []);
    } catch (err) {
      console.error(err);
      alert('Atenção: O robô backend não conseguiu extrair os dados. Verifique o terminal do Node.js.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    let result = properties.filter(property => {
      const matchesPrice = property.price <= maxPrice;
      const matchesRooms = property.bedrooms === rooms;
      
      return matchesPrice && matchesRooms;
    });

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'distance-asc') {
      result = [...result].sort((a, b) => a.distance - b.distance);
    }

    return result;
  }, [properties, maxPrice, rooms, sortBy]);

  const getImageUrl = (property) => {
    if (!property.image) return '';
    // If it's already a fallback Unsplash image, use directly
    if (property.image.includes('unsplash.com')) return property.image;
    // Route everything through our proxy for correct Referer headers
    return `http://localhost:3001/api/image?url=${encodeURIComponent(property.image)}`;
  };

  return (
    <div className="app-container">
      <main className="dashboard">
        <header className="header" style={{paddingBottom: '16px'}}>
          <div className="headline">
            <h1 className="title">Imóveis Curitiba</h1>
            <p className="reference-display">{referenceLocation ? `${referenceLocation} - Curitiba` : 'Curitiba'}</p>
          </div>
          {stats && (
            <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)'}}>
              {stats.map((s, idx) => {
                const icon = s.count > 0 ? '🟢' : s.blocked ? '⚠️' : '🔴';
                const color = s.count > 0 ? '#4ade80' : s.blocked ? '#fbbf24' : '#f87171';
                const label = s.blocked && s.count === 0 ? `${s.name} (bloqueado)` : `${s.name} (${s.count})`;
                return (
                  <span key={idx} style={{fontSize: '0.85rem', fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: '6px'}}>
                    {icon} {label}
                  </span>
                );
              })}
            </div>
          )}
        </header>

        <section className="filters-block">
          <div className="panel filter-item">
            <div className="filter-card">
              <span className="filter-label">REFERÊNCIA</span>
              <input 
                type="text" 
                className="filter-input" 
                value={referenceLocation}
                onChange={(e) => setReferenceLocation(e.target.value)}
                placeholder="Ex: Praça do Japão"
              />
            </div>
            
            <div className="filter-card">
              <span className="filter-label">ORDENAR POR</span>
              <select className="filter-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{background: 'rgba(30,30,30,0.8)', color: 'white'}}>
                <option value="none">Relevância (Padrão)</option>
                <option value="price-asc">Menor Preço Primeiro</option>
                <option value="distance-asc">Mais Próximos</option>
              </select>
            </div>
          </div>

          <div className="panel filter-item">
            <span className="filter-label">Preço Máximo</span>
            <div className="filter-input-group">
              <span>R$</span>
              <input 
                type="number" 
                className="filter-input" 
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                step="100"
              />
            </div>
          </div>

          <div className="panel filter-item">
            <span className="filter-label">Quartos</span>
            <div className="room-toggles">
              <button 
                className={`room-toggle ${rooms === 2 ? 'active' : ''}`}
                onClick={() => setRooms(2)}
              >
                2
              </button>
              <button 
                className={`room-toggle ${rooms === 3 ? 'active' : ''}`}
                onClick={() => setRooms(3)}
              >
                3
              </button>
            </div>
          </div>

          <div className="panel filter-item">
            <span className="filter-label">Referência</span>
            <div className="filter-input-group" style={{padding: '8px', minWidth: '180px'}}>
              <input 
                type="text" 
                className="filter-input" 
                style={{width: '100%', fontSize: '0.95rem'}}
                value={referenceLocation}
                onChange={(e) => setReferenceLocation(e.target.value)}
                placeholder="Endereço base"
              />
            </div>
          </div>

          <div className="panel filter-item">
            <span className="filter-label">Distância Máx ({maxDistance}km)</span>
            <div className="filter-input-group" style={{padding: '8px 12px', border: 'none', background: 'transparent', boxShadow: 'none'}}>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="distance-slider"
              />
            </div>
          </div>

          <div className="filter-item" style={{justifyContent: 'flex-end', paddingBottom: '4px'}}>
            <button 
              className={`btn-primary ${isLoading ? 'loading' : ''}`} 
              onClick={handleUpdate}
              disabled={isLoading}
            >
              {isLoading ? 'Buscando...' : 'Atualizar Buscar'}
            </button>
          </div>
          
          <div className="panel filter-item" style={{marginLeft: 'auto'}}>
            <span className="filter-label">Resultados</span>
            <div style={{fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', textAlign: 'center'}}>
              {filteredProperties.length}
            </div>
          </div>
        </section>

        <section className="property-grid">
          {filteredProperties.length === 0 && (
            <div className="empty-state">
              <h2>Nenhum imóvel encontrado</h2>
              <p>Tente ajustar os filtros de preço ou quartos.</p>
            </div>
          )}

          {filteredProperties.map(property => (
            <div key={property.id} className="property-card panel" onClick={() => setSelectedProperty(property)} style={{cursor: 'pointer'}}>
               <div className="card-image-wrapper">
                 <div className="source-badge">{property.source}</div>
                 <img 
                   src={getImageUrl(property)} 
                   alt={property.title} 
                   className="card-image"
                   onError={(e) => {
                     e.target.onerror = null;
                     e.target.src = "https://images.unsplash.com/photo-1560448205-d6c5cc28172d?auto=format&fit=crop&w=400&q=80";
                   }}
                 />
               </div>
               
               <div className="card-price">R$ {property.price.toLocaleString('pt-BR')}</div>
               <div className="card-title">{property.title}</div>
               
               <div className="card-features">
                 <div className="feature-item">
                   <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                   {property.bedrooms} Quartos
                 </div>
                 <div className="feature-item">
                   <svg className="feature-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                   {property.size}m²
                 </div>
               </div>
               
               <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px'}}>
                 <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Distância: {property.distance} km</p>
                 <span style={{fontSize: '0.85rem', color: 'var(--accent-yellow)', fontWeight: '600'}}>Ver Anúncio &rarr;</span>
               </div>
               
               {property.address && (
                 <p style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                   📍 {property.address}
                 </p>
               )}
            </div>
          ))}
        </section>
      </main>

      <aside className={`side-panel ${selectedProperty ? 'open' : ''}`}>
        {selectedProperty && (
          <div className="side-panel-content">
            <div className="side-panel-header">
              <img 
                src={getImageUrl(selectedProperty)} 
                alt={selectedProperty.title} 
                className="side-panel-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1560448205-d6c5cc28172d?auto=format&fit=crop&w=400&q=80";
                }}
              />
              <button className="close-btn" onClick={() => setSelectedProperty(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="panel-body">
              <h2 className="panel-price">R$ {selectedProperty.price.toLocaleString('pt-BR')}</h2>
              <h3 className="panel-title">{selectedProperty.title}</h3>
              <p className="panel-location">A {selectedProperty.distance} km de {referenceLocation}</p>

              <div className="panel-features">
                <div className="feature-box">
                  <span className="feature-value">{selectedProperty.bedrooms}</span>
                  <span className="feature-label">Quartos</span>
                </div>
                <div className="feature-box">
                  <span className="feature-value">{selectedProperty.size}</span>
                  <span className="feature-label">m²</span>
                </div>
              </div>

              <div className="panel-description">
                <p>{selectedProperty.description}</p>
              </div>

              <button 
                className="btn-primary flex-center" 
                style={{width: '100%', justifyContent: 'center', marginTop: '32px'}}
                onClick={() => window.open(selectedProperty.originalUrl, '_blank')}
              >
                Abrir Anúncio Original ({selectedProperty.source}) &rarr;
              </button>

              <div className="share-buttons">
                <button 
                  className="btn-share whatsapp" 
                  onClick={() => window.open(`https://api.whatsapp.com/send?text=Olha%20esse%20imóvel%20que%20encontrei%20no%20${selectedProperty.source}%20por%20R$%20${selectedProperty.price.toLocaleString('pt-BR')}:%20${selectedProperty.originalUrl}`, '_blank')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.372-4.35 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
                <button 
                  className="btn-share email" 
                  onClick={() => window.location.href = `mailto:?subject=Imóvel incrível no ${selectedProperty.source}&body=Olha esse imóvel que encontrei no ${selectedProperty.source} por R$ ${selectedProperty.price.toLocaleString('pt-BR')}: ${selectedProperty.originalUrl}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  E-mail
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default App;
