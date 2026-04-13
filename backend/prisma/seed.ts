import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...\n');

  // ── Crear usuario demo ──────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'admin@leadpilot.com' },
    update: {},
    create: {
      email: 'admin@leadpilot.com',
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('✅ Usuario creado:', user.name);

  // ── Crear empresas con sus etapas ───────────────────
  const companiesData = [
    {
      name: 'Advanced Investing',
      slug: 'advanced-investing',
      color: '#2596DC',
      description: 'Plataforma de inversión inmobiliaria inteligente',
      stages: [
        { name: 'Nuevo', slug: 'nuevo', color: '#3B82F6', position: 0, role: 'ENTRY' as const },
        { name: 'Contactado', slug: 'contactado', color: '#F59E0B', position: 1, role: 'CONTACTED' as const },
        { name: 'Calificado', slug: 'calificado', color: '#8B5CF6', position: 2, role: 'FOLLOW_UP' as const },
        { name: 'Propuesta', slug: 'propuesta', color: '#EC4899', position: 3, role: 'FOLLOW_UP' as const },
        { name: 'Ganado', slug: 'ganado', color: '#10B981', position: 4, isFinal: true, role: 'WON' as const },
        { name: 'Perdido', slug: 'perdido', color: '#EF4444', position: 5, isFinal: true, role: 'LOST' as const },
      ],
    },
    {
      name: 'Advanced AI Advisor',
      slug: 'advanced-ai-advisor',
      color: '#8B5CF6',
      description: 'Asesor inteligente con IA para ventas',
      stages: [
        { name: 'Entrante', slug: 'entrante', color: '#3B82F6', position: 0, role: 'ENTRY' as const },
        { name: 'Respondido', slug: 'respondido', color: '#F59E0B', position: 1, role: 'CONTACTED' as const },
        { name: 'Demo', slug: 'demo', color: '#8B5CF6', position: 2, role: 'FOLLOW_UP' as const },
        { name: 'Negociación', slug: 'negociacion', color: '#EC4899', position: 3, role: 'FOLLOW_UP' as const },
        { name: 'Cerrado', slug: 'cerrado', color: '#10B981', position: 4, isFinal: true, role: 'WON' as const },
      ],
    },
    {
      name: 'Yamini Kitchens',
      slug: 'yamini-kitchens',
      color: '#EC4899',
      description: 'Cocinas premium a medida',
      stages: [
        { name: 'Lead', slug: 'lead', color: '#3B82F6', position: 0, role: 'ENTRY' as const },
        { name: 'Consulta', slug: 'consulta', color: '#F59E0B', position: 1, role: 'CONTACTED' as const },
        { name: 'Cotización', slug: 'cotizacion', color: '#8B5CF6', position: 2, role: 'FOLLOW_UP' as const },
        { name: 'Aprobado', slug: 'aprobado', color: '#10B981', position: 3, role: 'FOLLOW_UP' as const },
        { name: 'Instalado', slug: 'instalado', color: '#06B6D4', position: 4, isFinal: true, role: 'WON' as const },
      ],
    },
  ];

  for (const companyData of companiesData) {
    const company = await prisma.company.upsert({
      where: { slug: companyData.slug },
      update: {},
      create: {
        name: companyData.name,
        slug: companyData.slug,
        color: companyData.color,
        description: companyData.description,
        stages: {
          create: companyData.stages,
        },
      },
      include: { stages: { orderBy: { position: 'asc' } } },
    });

    console.log(`✅ Empresa: ${company.name} (${company.stages.length} etapas)`);

    // ── Crear leads demo para cada empresa ──────────
    const sampleLeads = getSampleLeads(company.name);
    for (let i = 0; i < sampleLeads.length; i++) {
      const lead = sampleLeads[i];
      const stageIndex = Math.min(lead.stageIndex, company.stages.length - 1);
      const stage = company.stages[stageIndex];

      await prisma.lead.create({
        data: {
          companyId: company.id,
          stageId: stage.id,
          fullName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          tags: lead.tags,
          position: i,
          nextFollowUpAt: lead.nextFollowUp ? new Date(lead.nextFollowUp) : null,
        },
      });
    }

    console.log(`   📋 ${sampleLeads.length} leads creados`);
  }

  console.log('\n🎉 Seed completado exitosamente!');
}

function getSampleLeads(companyName: string) {
  if (companyName === 'Advanced Investing') {
    return [
      { fullName: 'Carlos Mendoza', email: 'carlos@email.com', phone: '+52 55 1234 5678', source: 'Google Ads', tags: ['hot', 'inversión'], stageIndex: 0, nextFollowUp: '2026-04-05' },
      { fullName: 'María García', email: 'maria.g@email.com', phone: '+52 55 8765 4321', source: 'Instagram', tags: ['interesado'], stageIndex: 0, nextFollowUp: '2026-04-03' },
      { fullName: 'Roberto Silva', email: 'roberto.s@email.com', phone: '+52 33 1111 2222', source: 'Referido', tags: ['premium'], stageIndex: 1, nextFollowUp: '2026-04-02' },
      { fullName: 'Ana Martínez', email: 'ana.m@email.com', phone: '+52 81 3333 4444', source: 'Google Ads', tags: ['hot'], stageIndex: 1, nextFollowUp: null },
      { fullName: 'Luis Hernández', email: 'luis.h@email.com', phone: '+52 55 5555 6666', source: 'Facebook', tags: ['nuevo'], stageIndex: 2, nextFollowUp: '2026-04-06' },
      { fullName: 'Patricia López', email: 'patricia@email.com', phone: '+52 55 7777 8888', source: 'Referido', tags: ['vip'], stageIndex: 2, nextFollowUp: '2026-04-04' },
      { fullName: 'Fernando Torres', email: 'fernando.t@email.com', phone: '+52 33 9999 0000', source: 'Instagram', tags: ['interesado'], stageIndex: 3, nextFollowUp: '2026-04-07' },
      { fullName: 'Diana Ramírez', email: 'diana.r@email.com', phone: '+52 81 1212 3434', source: 'Google Ads', tags: ['hot', 'premium'], stageIndex: 4, nextFollowUp: null },
    ];
  }

  if (companyName === 'Advanced AI Advisor') {
    return [
      { fullName: 'Jorge Castillo', email: 'jorge.c@empresa.com', phone: '+1 305 111 2222', source: 'LinkedIn', tags: ['b2b'], stageIndex: 0, nextFollowUp: '2026-04-04' },
      { fullName: 'Sandra Vega', email: 'sandra.v@tech.com', phone: '+1 786 333 4444', source: 'Webinar', tags: ['tech'], stageIndex: 0, nextFollowUp: '2026-04-03' },
      { fullName: 'Andrés Ruiz', email: 'andres.r@corp.com', phone: '+1 305 555 6666', source: 'LinkedIn', tags: ['enterprise'], stageIndex: 1, nextFollowUp: '2026-04-05' },
      { fullName: 'Valentina Morales', email: 'val.m@startup.io', phone: '+1 786 777 8888', source: 'Google Ads', tags: ['startup'], stageIndex: 2, nextFollowUp: '2026-04-06' },
      { fullName: 'Diego Paredes', email: 'diego.p@firm.com', phone: '+1 305 999 0000', source: 'Referido', tags: ['premium'], stageIndex: 3, nextFollowUp: '2026-04-08' },
    ];
  }

  // Yamini Kitchens
  return [
    { fullName: 'Lucía Herrera', email: 'lucia.h@gmail.com', phone: '+52 55 1010 2020', source: 'Instagram', tags: ['residencial'], stageIndex: 0, nextFollowUp: '2026-04-03' },
    { fullName: 'Marcos Delgado', email: 'marcos.d@gmail.com', phone: '+52 33 3030 4040', source: 'Referido', tags: ['remodelación'], stageIndex: 0, nextFollowUp: '2026-04-04' },
    { fullName: 'Isabel Navarro', email: 'isabel.n@gmail.com', phone: '+52 81 5050 6060', source: 'Google Ads', tags: ['nueva-cocina'], stageIndex: 1, nextFollowUp: '2026-04-05' },
    { fullName: 'Ricardo Flores', email: 'ricardo.f@gmail.com', phone: '+52 55 7070 8080', source: 'Instagram', tags: ['premium', 'urgente'], stageIndex: 2, nextFollowUp: '2026-04-02' },
    { fullName: 'Carmen Ortiz', email: 'carmen.o@gmail.com', phone: '+52 33 9090 1010', source: 'Facebook', tags: ['residencial'], stageIndex: 3, nextFollowUp: null },
    { fullName: 'Alejandro Peña', email: 'alex.p@gmail.com', phone: '+52 81 2020 3030', source: 'Referido', tags: ['comercial'], stageIndex: 4, nextFollowUp: null },
  ];
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
