export const mockSources = [
  { id: 'all', name: 'Todos' },
  { id: 'quintoandar', name: 'QuintoAndar' },
  { id: 'zap', name: 'ZAP Imóveis' },
  { id: 'imovelweb', name: 'Imovelweb' },
  { id: 'chavesnamao', name: 'Chaves na Mão' }
];

export const generateMockData = () => {
  const sources = ['quintoandar', 'zap', 'imovelweb', 'chavesnamao'];
  const titles = [
    'Lindo apartamento mobiliado',
    'Excelente oportunidade no Ecoville',
    'Cobertura espaçosa em Orleans',
    'Apartamento moderno com varanda',
    'Imóvel aconchegante perto do parque',
    'Residência premium com lazer completo',
    'Apartamento face norte bem iluminado',
    'Prédio novo, primeira locação'
  ];

  const realEstateImages = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1560448205-d6c5cc28172d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1de2d9d0cb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1505691938895-1758d7bef51a?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=400&q=80'
  ];
  
  const properties = [];
  
  for (let i = 1; i <= 30; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const bedrooms = Math.random() > 0.5 ? 2 : 3;
    const size = Math.floor(Math.random() * (120 - 55 + 1) + 55); // 55m² to 120m²
    
    // Price between 1500 and 6000
    const basePrice = Math.floor(Math.random() * 45) * 100 + 1500; 
    
    // Add random distance up to 20km from Dr Ivo Reck 55
    const distance = (Math.random() * 19.5 + 0.5).toFixed(1); 

    properties.push({
      id: `${source}-${i}`,
      title,
      source,
      bedrooms,
      size,
      price: basePrice,
      distance: parseFloat(distance),
      description: 'Lindo imóvel recém reformado, com armários embutidos e ótima localização, perfeito para sua família. Aceita pet e possui vaga de garagem coberta.',
      image: realEstateImages[Math.floor(Math.random() * realEstateImages.length)]
    });
  }
  
  return properties;
};

export const MOCK_PROPERTIES = generateMockData();
