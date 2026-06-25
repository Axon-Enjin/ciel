"""
Seed script for evidence corpus.

Populates the database with sample development evidence sources
across T1-T4 tiers for ToC generation testing.

Run: python -m ai_service.scripts.seed_evidence
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ai_service.services.evidence_retrieval import evidence_retriever
from ai_service.services.supabase_client import supabase_client


# Sample evidence sources across T1-T4 tiers
SAMPLE_SOURCES = [
    # T1: Systematic Reviews & Meta-Analyses
    {
        "title": "Effectiveness of Community-Based Nutrition Programs: A Systematic Review",
        "url": "https://doi.org/10.1016/example.2024.001",
        "tier": "T1",
        "chunk": """Systematic review of 45 randomized controlled trials examining community-based nutrition interventions in low-income settings. Meta-analysis shows significant reduction in child stunting (SMD -0.42, 95% CI -0.58 to -0.26, p<0.001) when programs include: (1) nutrition education for caregivers, (2) growth monitoring, (3) supplementary feeding for children under 5, and (4) community health worker support. Effect sizes were largest in programs with >12 months duration and high community engagement (>70% participation rates).""",
        "metadata": {
            "author": "Smith, J. et al.",
            "year": 2024,
            "domain": "nutrition",
            "study_count": 45,
            "countries": ["Kenya", "Bangladesh", "Peru", "Ethiopia"]
        }
    },
    {
        "title": "Cash Transfers and Child Health Outcomes: Meta-Analysis of Impact Evaluations",
        "url": "https://doi.org/10.1016/example.2023.002",
        "tier": "T1",
        "chunk": """Meta-analysis of 32 impact evaluations of unconditional cash transfer programs across Sub-Saharan Africa and South Asia. Pooled estimates show 15% reduction in child mortality (RR 0.85, 95% CI 0.78-0.92), 23% increase in healthcare utilization, and 18% improvement in dietary diversity scores. Effects are mediated by household income increases (average $45/month) and are strongest when transfers are: (1) regular and predictable, (2) sufficient to cover 20%+ of household expenses, and (3) targeted to mothers/primary caregivers.""",
        "metadata": {
            "author": "Johnson, M. et al.",
            "year": 2023,
            "domain": "social_protection",
            "study_count": 32,
            "countries": ["Uganda", "Malawi", "India", "Nepal"]
        }
    },
    
    # T2: Randomized Controlled Trials
    {
        "title": "Impact of School Feeding Programs on Educational Outcomes: RCT in Rural Kenya",
        "url": "https://doi.org/10.1016/example.2024.003",
        "tier": "T2",
        "chunk": """Cluster-randomized controlled trial (n=120 schools, 8,400 students) evaluating school feeding program in rural Kenya. Treatment schools received daily hot meals (400 kcal, 12g protein) for 18 months. Results: 12% increase in attendance (p<0.001), 0.3 SD improvement in test scores (p=0.002), 8% reduction in dropout rates. Cost-effectiveness analysis shows $0.50 per additional day of attendance. Subgroup analysis reveals larger effects for girls (attendance +15%, p<0.001) and children from food-insecure households (test scores +0.4 SD, p<0.001).""",
        "metadata": {
            "author": "Omondi, P. et al.",
            "year": 2024,
            "domain": "education",
            "sample_size": 8400,
            "countries": ["Kenya"]
        }
    },
    {
        "title": "Mobile Health Interventions for Maternal Health: RCT in Bangladesh",
        "url": "https://doi.org/10.1016/example.2023.004",
        "tier": "T2",
        "chunk": """Randomized controlled trial (n=2,400 pregnant women) testing mobile health (mHealth) intervention in rural Bangladesh. Treatment group received weekly SMS reminders for antenatal care visits, nutrition advice, and danger sign recognition. Control group received standard care. Primary outcomes: 28% increase in 4+ ANC visits (OR 1.28, 95% CI 1.15-1.42, p<0.001), 35% increase in facility-based delivery (OR 1.35, 95% CI 1.20-1.52, p<0.001), 22% reduction in low birth weight (OR 0.78, 95% CI 0.65-0.93, p=0.006). Cost per additional facility delivery: $12.""",
        "metadata": {
            "author": "Rahman, S. et al.",
            "year": 2023,
            "domain": "health",
            "sample_size": 2400,
            "countries": ["Bangladesh"]
        }
    },
    
    # T3: Observational Studies & Case Studies
    {
        "title": "Community-Led Total Sanitation: Longitudinal Study in Rural India",
        "url": "https://doi.org/10.1016/example.2024.005",
        "tier": "T3",
        "chunk": """Longitudinal observational study (n=450 villages, 5-year follow-up) examining Community-Led Total Sanitation (CLTS) approach in rural India. Villages implementing CLTS showed: 65% increase in latrine coverage (from 23% to 88%), 42% reduction in open defecation, 31% decrease in diarrheal disease incidence among children under 5. Success factors identified through qualitative interviews: (1) strong local leadership, (2) community ownership of process, (3) social norm change through triggering activities, (4) follow-up monitoring by community health workers. Sustainability analysis shows 78% of latrines still in use after 3 years.""",
        "metadata": {
            "author": "Patel, R. et al.",
            "year": 2024,
            "domain": "wash",
            "sample_size": 450,
            "countries": ["India"]
        }
    },
    {
        "title": "Women's Self-Help Groups and Economic Empowerment: Case Study from Ethiopia",
        "url": "https://doi.org/10.1016/example.2023.006",
        "tier": "T3",
        "chunk": """Mixed-methods case study of women's self-help groups (SHGs) in rural Ethiopia (n=85 groups, 1,275 women, 3-year observation). SHG members showed: 45% increase in household income, 67% increase in savings, 52% increase in decision-making power (measured by validated scale). Qualitative data reveals mechanisms: (1) access to microcredit enables income-generating activities, (2) group solidarity provides social support, (3) financial literacy training improves money management, (4) collective action increases bargaining power. Challenges include: limited market access, seasonal income variability, and need for ongoing facilitation support.""",
        "metadata": {
            "author": "Tadesse, A. et al.",
            "year": 2023,
            "domain": "livelihoods",
            "sample_size": 1275,
            "countries": ["Ethiopia"]
        }
    },
    
    # T4: Expert Opinion & Grey Literature
    {
        "title": "Best Practices for Community Engagement in Development Programs",
        "url": "https://www.example-ngo.org/resources/community-engagement-guide",
        "tier": "T4",
        "chunk": """Practitioner guide based on 20 years of field experience implementing community development programs across East Africa. Key recommendations: (1) Invest 3-6 months in community entry and relationship building before program activities, (2) Use participatory needs assessment methods (focus groups, community mapping, wealth ranking), (3) Establish representative community committees with 40%+ women's participation, (4) Co-create program design with community members, not just consultation, (5) Build local capacity through training-of-trainers approach, (6) Establish transparent feedback mechanisms and regular community meetings. Programs following these principles show 2-3x higher sustainability rates.""",
        "metadata": {
            "author": "International Development NGO Consortium",
            "year": 2024,
            "domain": "community_development",
            "organization": "IDNC"
        }
    },
    {
        "title": "Theory of Change Development: Lessons from 100+ Social Programs",
        "url": "https://www.example-foundation.org/learning/toc-lessons",
        "tier": "T4",
        "chunk": """Synthesis of lessons learned from developing Theories of Change for 100+ social sector programs across health, education, and livelihoods. Common pitfalls: (1) Overly linear logic models that ignore feedback loops and complexity, (2) Insufficient attention to contextual factors and assumptions, (3) Weak evidence base for causal pathways, (4) Lack of stakeholder input in ToC development. Recommendations: (1) Use systems thinking to map interconnections, (2) Explicitly state and test assumptions, (3) Ground each causal link in evidence (even if T3/T4), (4) Involve beneficiaries and implementers in ToC co-creation, (5) Treat ToC as living document, updated based on monitoring data.""",
        "metadata": {
            "author": "Global Development Foundation",
            "year": 2024,
            "domain": "monitoring_evaluation",
            "organization": "GDF"
        }
    },
    
    # Additional T1 sources for diversity
    {
        "title": "Water, Sanitation and Hygiene Interventions and Child Health: Systematic Review",
        "url": "https://doi.org/10.1016/example.2024.007",
        "tier": "T1",
        "chunk": """Systematic review and meta-analysis of 67 studies examining WASH interventions and child health outcomes in low- and middle-income countries. Pooled analysis shows: 25% reduction in diarrheal disease (RR 0.75, 95% CI 0.68-0.82), 15% reduction in stunting (RR 0.85, 95% CI 0.78-0.93), 12% reduction in child mortality (RR 0.88, 95% CI 0.81-0.96). Most effective interventions combine: (1) improved water source within 30 minutes, (2) basic sanitation facilities, (3) handwashing with soap promotion, (4) hygiene education. Effects are dose-dependent and strongest with comprehensive WASH packages.""",
        "metadata": {
            "author": "Chen, L. et al.",
            "year": 2024,
            "domain": "wash",
            "study_count": 67,
            "countries": ["Multiple LMICs"]
        }
    },
    {
        "title": "Early Childhood Development Programs: Meta-Analysis of Long-Term Impacts",
        "url": "https://doi.org/10.1016/example.2023.008",
        "tier": "T1",
        "chunk": """Meta-analysis of 28 longitudinal studies tracking children who participated in early childhood development (ECD) programs in developing countries. Long-term outcomes (10-20 year follow-up): 0.35 SD increase in educational attainment, 23% higher earnings in adulthood, 18% reduction in criminal behavior, 15% better health outcomes. Cost-benefit analysis shows $1 invested returns $7-13 in economic benefits. Most effective programs include: (1) center-based care with trained caregivers, (2) parenting education and home visits, (3) nutrition supplementation, (4) start before age 3, (5) duration of 2+ years. Effects are largest for disadvantaged children.""",
        "metadata": {
            "author": "Williams, K. et al.",
            "year": 2023,
            "domain": "early_childhood",
            "study_count": 28,
            "countries": ["Jamaica", "Colombia", "Turkey", "Philippines"]
        }
    }
]


async def seed_corpus():
    """Seed the evidence corpus with sample sources."""
    print("🌱 Seeding evidence corpus...")
    print(f"📊 Total sources to seed: {len(SAMPLE_SOURCES)}")
    
    # Check database connection
    print("\n🔍 Checking database connection...")
    is_healthy = await supabase_client.health_check()
    if not is_healthy:
        print("❌ Database connection failed. Check your Supabase configuration.")
        return
    print("✅ Database connection successful")
    
    # Get current corpus stats
    print("\n📈 Current corpus statistics:")
    stats = evidence_retriever.get_corpus_stats()
    print(f"   Total sources: {stats['total_sources']}")
    for tier, count in stats['by_tier'].items():
        print(f"   {tier}: {count} sources")
    
    # Seed sources
    print("\n🚀 Seeding sources (this may take a few minutes for embeddings)...")
    try:
        source_ids = evidence_retriever.seed_evidence_corpus(
            sources=SAMPLE_SOURCES,
            generate_embeddings=True
        )
        print(f"✅ Successfully seeded {len(source_ids)} sources")
        
        # Get updated stats
        print("\n📈 Updated corpus statistics:")
        stats = evidence_retriever.get_corpus_stats()
        print(f"   Total sources: {stats['total_sources']}")
        for tier, count in stats['by_tier'].items():
            print(f"   {tier}: {count} sources")
        
        # Test retrieval
        print("\n🧪 Testing evidence retrieval...")
        test_query = "What interventions improve child nutrition in low-income communities?"
        chunks = evidence_retriever.retrieve_evidence(
            query=test_query,
            top_k=3,
            min_relevance=0.5
        )
        print(f"   Query: {test_query}")
        print(f"   Retrieved {len(chunks)} relevant sources:")
        for i, chunk in enumerate(chunks, 1):
            print(f"   {i}. [{chunk.tier}] {chunk.citation[:80]}... (score: {chunk.relevance_score:.3f})")
        
        print("\n✨ Evidence corpus seeding complete!")
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(seed_corpus())

# Made with Bob
