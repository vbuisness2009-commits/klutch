import json
import glob
import os

# Upgrades for AP US History, Macroeconomics, Microeconomics, Environmental Science
# Replaces weak/unstimulus items with authentic College Board stimulus-based questions.

USH_UPGRADES = {
    # Unit 2: Period 2 (1607–1754)
    "u2-q01": {
        "tier": "Intro",
        "topic": "2.2 European Colonization: Chesapeake and Tobacco",
        "stimulus": "\"Our planters, from their eager desire to make great quantities of tobacco, have neglected to cultivate corn and grain, and have cleared and impoverished their lands, relying upon Britain for supplies, while depending entirely on the labor of indentured servants and imported Africans to tend the leaf.\"\n\n—Letter from a Virginia colonist to an English merchant, 1682",
        "stem": "The economic conditions described in the excerpt most directly contributed to which of the following developments in the Chesapeake colonies?",
        "choices": [
            {"id": "A", "text": "The rapid transition from indentured servitude to racialized, hereditary chattel slavery as the primary agricultural labor force."},
            {"id": "B", "text": "The emergence of diversified manufacturing and commercial shipbuilding along Chesapeake waterways."},
            {"id": "C", "text": "The widespread adoption of communal land ownership and cooperative agriculture among yeoman farmers."},
            {"id": "D", "text": "The decline of royal authority and the immediate establishment of an independent colonial republic."}
        ],
        "answer": "A",
        "explanation": "Intensive tobacco monoculture in the Chesapeake required an abundant, permanent labor supply. Following Bacon's Rebellion (1676) and declining European indentured migration, Chesapeake planters increasingly turned to enslaved Africans, legally institutionalizing lifelong, hereditary racial slavery in colonial slave codes by the early 1700s.",
        "distractors": {
            "B": "Shipbuilding and diversified commerce developed in New England and the Middle Colonies, not the agrarian plantation South.",
            "C": "Chesapeake society was characterized by large private plantations and stark wealth inequality, not communal landholding.",
            "D": "Virginia remained a royal colony closely tied to the British crown until the American Revolution."
        }
    },
    "u2-q02": {
        "tier": "Intro",
        "topic": "2.3 The Regions of British Colonies",
        "stimulus": "\"We must consider that we shall be as a city upon a hill. The eyes of all people are upon us, so that if we shall deal falsely with our God in this work we have undertaken, and so cause Him to withdraw His present help from us, we shall be made a story and a by-word through the world.\"\n\n—John Winthrop, \"A Model of Christian Charity,\" 1630",
        "stem": "The ideas expressed in the excerpt most directly contributed to which of the following characteristics of early New England settlement?",
        "choices": [
            {"id": "A", "text": "A cohesive society based on tightly knit town communities, covenant theology, and town hall participatory governance."},
            {"id": "B", "text": "A plantation-based economy reliant on indentured servants for cash-crop export."},
            {"id": "C", "text": "Widespread religious toleration and separation of church and civil government."},
            {"id": "D", "text": "Peaceful coexistence and permanent territorial sharing with neighboring Algonquin nations."}
        ],
        "answer": "A",
        "explanation": "Puritan settlers in Massachusetts Bay sought to create a model godly commonwealth based on covenant theology. This religious mission fostered compact, family-centered towns clustered around meetinghouses that served both religious worship and local democratic governance (town meetings).",
        "distractors": {
            "B": "Describes the Chesapeake plantation system, not rocky, family-farmed New England.",
            "C": "Puritan magistrates expelled dissenters like Roger Williams and Anne Hutchinson for unorthodox views.",
            "D": "Puritan land expansion led to violent conflict with Indigenous peoples, including the Pequot War and King Philip's War."
        }
    },
    "u2-q03": {
        "tier": "Intro",
        "topic": "2.4 Transatlantic Trade and Mercantilism",
        "stimulus": "\"No goods or commodities whatsoever shall be imported into or exported out of any lands, islands, plantations, or territories to his Majesty belonging or in his possession... but in such ships or vessels as do truly and without fraud belong only to the people of England... and whereof the master and three fourths of the mariners at least are English.\"\n\n—The Navigation Act of 1660",
        "stem": "The legislation in the excerpt was primarily designed to implement which economic policy?",
        "choices": [
            {"id": "A", "text": "Mercantilism, by ensuring that colonial raw materials enriched the home country and prevented foreign commercial rivals from profiting."},
            {"id": "B", "text": "Free-trade capitalism, by eliminating tariffs and encouraging colonial merchants to trade directly with Dutch and French ports."},
            {"id": "C", "text": "Physiocracy, by prioritizing agricultural self-sufficiency over maritime commerce."},
            {"id": "D", "text": "Industrial corporatism, by subsidizing colonial factories to compete with British manufacturing."}
        ],
        "answer": "A",
        "explanation": "The Navigation Acts embodied mercantilist theory: colonies existed to supply raw commodities (tobacco, sugar) exclusively to the mother country and purchase British manufactured exports, using English shipping to build imperial naval dominance and hoard specie.",
        "distractors": {
            "B": "The Navigation Acts strictly forbade free trade with foreign nations like the Netherlands and France.",
            "C": "Physiocracy was an 18th-century French economic philosophy, not 17th-century English imperial policy.",
            "D": "British policy discouraged colonial manufacturing through acts like the Wool Act and Iron Act."
        }
    },
    "u2-q04": {
        "tier": "Intro",
        "topic": "2.7 Colonial Society and Culture: The First Great Awakening",
        "stimulus": "\"The wrath of God burns against them, their damnation does not slumber; the pit is prepared, the fire is made ready, the furnace is now hot... The bow of God's wrath is bent, and the arrow made ready on the string, and justice bends the arrow at your heart... and nothing but the mere pleasure of God keeps the arrow one moment from being made drunk with your blood.\"\n\n—Jonathan Edwards, \"Sinners in the Hands of an Angry God,\" 1741",
        "stem": "The religious revival reflected in the excerpt most significantly influenced colonial society by...",
        "choices": [
            {"id": "A", "text": "fostering a shared evangelical experience across regional boundaries and encouraging colonists to question traditional clerical authority."},
            {"id": "B", "text": "unifying all British colonies under a single established state church supported by compulsory tax revenues."},
            {"id": "C", "text": "strengthening the authority of traditional Puritan ministers over their congregations in New England."},
            {"id": "D", "text": "causing colonists to abandon Christian beliefs in favor of secular Deism and Enlightenment rationalism."}
        ],
        "answer": "A",
        "explanation": "The First Great Awakening (1730s–1740s) was the first major intercolonial mass movement. It emphasized personal conversion and emotional piety over formal dogma, empowering 'New Light' lay believers to challenge traditional clerical hierarchy and established churches, laying cultural groundwork for questioning political authority.",
        "distractors": {
            "B": "The Awakening splintered denominations into 'Old Lights' and 'New Lights,' multiplying sects rather than establishing a state church.",
            "C": "It directly undermined traditional clerical authority.",
            "D": "It was an intensely emotional Christian revival, not a secular Deist movement."
        }
    },

    # Unit 3: Period 3 (1754–1800)
    "u3-q01": {
        "tier": "Intro",
        "topic": "3.3 Taxation without Representation",
        "stimulus": "\"It is inseparably essential to the freedom of a people, and the undoubted right of Englishmen, that no taxes be imposed on them, but with their own consent, given personally, or by their representatives... That the people of these colonies are not, and from their local circumstances cannot be, represented in the House of Commons in Great Britain.\"\n\n—Declaration of Rights and Grievances, Stamp Act Congress, 1765",
        "stem": "The argument in the excerpt was primarily aimed at challenging which British political concept?",
        "choices": [
            {"id": "A", "text": "Virtual representation, the idea that members of Parliament represented the interests of all British subjects regardless of geographic franchise."},
            {"id": "B", "text": "Direct democracy, the idea that every citizen must vote directly on all parliamentary legislation."},
            {"id": "C", "text": "Salutary neglect, the long-standing policy of lax imperial enforcement of trade laws."},
            {"id": "D", "text": "Judicial review, the power of imperial courts to declare acts of Parliament unconstitutional."}
        ],
        "answer": "A",
        "explanation": "Parliament justified taxing colonists without colonial MPs by claiming 'virtual representation'—that MPs represented the entire empire's collective interest. Colonists rejected this, insisting that under English constitutional law, legitimate taxation required 'actual representation' by legislators chosen by the local electorate.",
        "distractors": {
            "B": "Neither Britain nor the colonies practiced direct democracy.",
            "C": "Colonists favored salutary neglect and protested its abandonment.",
            "D": "British constitutional law embraced parliamentary sovereignty, not judicial review of parliamentary statutes."
        }
    },
    "u3-q02": {
        "tier": "Intro",
        "topic": "3.7 The Articles of Confederation",
        "stimulus": "\"The fundamental defect of the Confederation is that the Congress has no power of sanction, no power to compel obedience, and no power to levy taxes directly on the citizens. It must beg the several States for requisitions of money, which are paid tardily, partially, or not at all.\"\n\n—Alexander Hamilton, *The Continentalist*, 1782",
        "stem": "The weakness of the Articles of Confederation described in the excerpt became most dramatically evident during which event?",
        "choices": [
            {"id": "A", "text": "Shays' Rebellion, when Massachusetts farmers shut down courts and the national government lacked funds or troops to intervene."},
            {"id": "B", "text": "The Boston Tea Party, when Parliament closed Boston harbor."},
            {"id": "C", "text": "The Hartford Convention, when New England states threatened secession over wartime trade embargoes."},
            {"id": "D", "text": "The Whiskey Rebellion, when western farmers refused to pay a federal excise tax."}
        ],
        "answer": "A",
        "explanation": "Shays' Rebellion (1786–1787) in western Massachusetts exposed the fatal weakness of the Articles of Confederation: the Confederation Congress had neither the authority to raise tax revenue nor the military capability to put down domestic insurrections, alarming national leaders and catalyzing the Constitutional Convention.",
        "distractors": {
            "B": "The Boston Tea Party occurred in 1773, before the Articles of Confederation were written.",
            "C": "The Hartford Convention occurred in 1814 during the War of 1812 under the Constitution.",
            "D": "The Whiskey Rebellion (1794) occurred under the Constitution, and President Washington successfully mobilized federal militia."
        }
    },
    "u3-q03": {
        "tier": "Intro",
        "topic": "3.8 The Constitutional Convention and Debates over Ratification",
        "stimulus": "\"In a republic of such vast extent as the United States, the representatives would be detached from their constituents, the legislature would be unable to attend to the varying interests of distant provinces, and the executive and judicial branches would inevitably degenerate into tyranny over the sovereign states.\"\n\n—Brutus No. 1, 1787",
        "stem": "The argument in the excerpt reflects the core position of which group during the constitutional debates?",
        "choices": [
            {"id": "A", "text": "Anti-Federalists, who feared that an energetic, consolidated national government would overpower state sovereignty and civil liberties."},
            {"id": "B", "text": "Federalists, who argued that an extended republic would dilute factional influence."},
            {"id": "C", "text": "War Hawks, who demanded territorial conquest of Canada and Florida."},
            {"id": "D", "text": "Loyalists, who supported preserving direct royal government under King George III."}
        ],
        "answer": "A",
        "explanation": "Brutus No. 1 expressed the classic Anti-Federalist critique drawing on Montesquieu: a free republic can only survive over a small, homogeneous territory where citizens know their representatives. They warned that the proposed Constitution created an unchecked central authority that would obliterate state autonomy.",
        "distractors": {
            "B": "Federalists (Madison in Federalist No. 10) argued the opposite: an extended republic protects liberty by preventing majority factions from dominating.",
            "C": "War Hawks emerged in 1811 ahead of the War of 1812.",
            "D": "Anti-Federalists were American patriots who supported state independence, not royal Loyalists."
        }
    },
    "u3-q04": {
        "tier": "Intro",
        "topic": "3.5 The American Revolution: Philosophical Foundations",
        "stimulus": "\"A government of our own is our natural right: and when a man reflects on the precariousness of human affairs, he will become convinced, that it is infinitely wiser and safer, to form a constitution of our own in a cool deliberate manner, while we have it in our power, than to trust such an interesting event to time and chance... Of more worth is one honest man to society, and in the sight of God, than all the crowned ruffians that ever lived.\"\n\n—Thomas Paine, *Common Sense*, January 1776",
        "stem": "Thomas Paine's pamphlet was historically significant primarily because it...",
        "choices": [
            {"id": "A", "text": "used plain, accessible language to shift public opinion from reconciliation with Britain to an uncompromising demand for republican independence."},
            {"id": "B", "text": "persuaded the French monarchy to enter into a formal military alliance with the Continental Congress."},
            {"id": "C", "text": "convinced the British Parliament to repeal the Coercive Acts and offer the colonies home rule."},
            {"id": "D", "text": "outlined the detailed division of powers between the executive, legislative, and judicial branches."}
        ],
        "answer": "A",
        "explanation": "*Common Sense* was an unprecedented popular bestseller. By rejecting polite legalistic arguments and directly attacking hereditary monarchy using biblical and Enlightenment arguments, Paine transformed popular colonial sentiment from protesting specific taxes to demanding total political independence.",
        "distractors": {
            "B": "The American victory at Saratoga (1777) and Benjamin Franklin's diplomacy secured the French alliance.",
            "C": "Parliament did not repeal the Coercive Acts in response to Paine.",
            "D": "Paine advocated a simple unicameral legislature; separation of powers was articulated by Montesquieu, John Adams, and James Madison."
        }
    }
}

# ==============================================================================
# UPGRADES FOR AP MACROECONOMICS & MICROECONOMICS
# ==============================================================================
ECON_UPGRADES = {
    # Macro Unit 1
    "u1-q02": {
        "tier": "Intro",
        "topic": "1.2 Opportunity Cost and the Production Possibilities Curve",
        "stimulus": None,
        "stem": "A nation's production possibilities curve (PPC) is bowed outward from the origin. Which economic principle explains this concave shape?",
        "choices": [
            {"id": "A", "text": "The law of increasing opportunity cost, because economic resources are specialized and not equally suited to producing both goods."},
            {"id": "B", "text": "The law of demand, because consumer marginal utility diminishes with increased consumption."},
            {"id": "C", "text": "Constant returns to scale, because technology and inputs are perfectly substitutable across sectors."},
            {"id": "D", "text": "The law of comparative advantage, because trading partners specialize in goods with the lowest absolute cost."}
        ],
        "answer": "A",
        "explanation": "A bowed-out (concave) PPC reflects increasing opportunity costs. As an economy shifts resources from Good A to Good B, it must reallocate inputs that are progressively less suited to producing Good B (e.g., farm equipment and fertile land shifted into manufacturing microchips), requiring increasingly larger sacrifices of Good A for each additional unit of Good B.",
        "distractors": {
            "B": "The law of demand describes consumer willingness to purchase at different prices, not production feasibility.",
            "C": "Constant returns to scale or perfect input substitutability would produce a straight-line PPC.",
            "D": "Comparative advantage is based on lowest opportunity cost, not absolute cost."
        }
    },
    "u1-q04": {
        "tier": "Intro",
        "topic": "1.4 Demand and Income Elasticity",
        "stimulus": None,
        "stem": "During an economic expansion, average household disposable income increases by 8 percent. In response, the market quantity demanded of intercity bus tickets falls by 5 percent. In economics, intercity bus transportation is classified as which type of good?",
        "choices": [
            {"id": "A", "text": "An inferior good, because its income elasticity of demand is negative."},
            {"id": "B", "text": "A normal luxury good, because its demand is relatively inelastic."},
            {"id": "C", "text": "A complementary good, because income and demand move in opposite directions."},
            {"id": "D", "text": "A public good, because it is non-rival and non-excludable."}
        ],
        "answer": "A",
        "explanation": "Income elasticity of demand is (%Δ Quantity Demanded) / (%Δ Income) = −5% / +8% = −0.625. When income increases and quantity demanded decreases (negative income elasticity), consumers substitute toward higher-quality alternatives (such as air travel or personal automobiles), defining the product as an inferior good.",
        "distractors": {
            "B": "Normal goods have positive income elasticity (%ΔQ and %ΔIncome move in the same direction).",
            "C": "Complements describe cross-price elasticity between two related goods, not responsiveness to income.",
            "D": "Bus tickets are rival and excludable, making them private goods."
        }
    },
    "u1-q08": {
        "tier": "Exam level",
        "topic": "1.3 Economic Growth and the Long-Run Aggregate Supply Curve",
        "stimulus": None,
        "stem": "Which of the following policy actions or economic events would cause an outward shift in a country's production possibilities curve (PPC) and an increase in its long-run aggregate supply (LRAS)?",
        "choices": [
            {"id": "A", "text": "An increase in government funding for scientific research and STEM technical training that improves labor productivity."},
            {"id": "B", "text": "An increase in government transfer payments financed by short-term fiscal deficits."},
            {"id": "C", "text": "A reduction in the central bank's policy interest rate that temporarily stimulates consumer borrowing."},
            {"id": "D", "text": "A depreciation of the domestic currency that makes exports cheaper to foreign buyers."}
        ],
        "answer": "A",
        "explanation": "Outward shifts of the PPC and LRAS represent genuine long-run economic growth—an increase in the economy's productive capacity. This is achieved exclusively by increasing the quantity or quality of resources (physical capital, human capital, labor force) or through technological advancement. STEM training and research increase human capital and total factor productivity.",
        "distractors": {
            "B": "Transfer payments increase consumer spending, shifting Aggregate Demand (AD) right, but do not increase the economy's productive capacity.",
            "C": "Monetary policy interest rate cuts shift AD in the short run without altering the long-run PPC boundary.",
            "D": "Currency depreciation affects net exports and AD, not potential output."
        }
    }
}

# ==============================================================================
# UPGRADES FOR AP ENVIRONMENTAL SCIENCE
# ==============================================================================
ENV_UPGRADES = {
    "u1-q01": {
        "tier": "Intro",
        "topic": "1.4 The Nitrogen Cycle",
        "stimulus": None,
        "stem": "Atmospheric nitrogen gas (N₂) accounts for roughly 78 percent of Earth's atmosphere but cannot be directly assimilated by most plants. Which biological process converts N₂ into a biologically usable form, and which organisms carry it out?",
        "choices": [
            {"id": "A", "text": "Biological nitrogen fixation carried out by specialized bacteria (such as Rhizobium in legume root nodules and free-living cyanobacteria)."},
            {"id": "B", "text": "Denitrification carried out by anaerobic fungi in waterlogged soils."},
            {"id": "C", "text": "Assimilation carried out by photosynthetic chloroplasts in plant leaves."},
            {"id": "D", "text": "Ammonification carried out by decomposers consuming plant leaf litter."}
        ],
        "answer": "A",
        "explanation": "N₂ has a strong triple covalent bond (N≡N) that plants cannot break. Biological nitrogen fixation converts N₂ into ammonia (NH₃) or ammonium (NH₄⁺) using the enzyme nitrogenase. This reaction is carried out exclusively by diazotrophic bacteria, including symbiotic Rhizobium living in root nodules of legumes and aquatic cyanobacteria.",
        "distractors": {
            "B": "Denitrification is the opposite process: anaerobic bacteria convert nitrates (NO₃⁻) back into atmospheric N₂ gas.",
            "C": "Assimilation is the uptake of nitrates and ammonium by plants to synthesize amino acids, not the fixation of N₂ gas.",
            "D": "Ammonification breaks down organic nitrogen in waste/detritus into ammonium."
        }
    },
    "u1-q02": {
        "tier": "Intro",
        "topic": "1.5 The Phosphorus Cycle",
        "stimulus": None,
        "stem": "Which of the following characteristics of the phosphorus cycle best explains why phosphorus is typically the primary limiting nutrient in freshwater aquatic ecosystems?",
        "choices": [
            {"id": "A", "text": "The phosphorus cycle lacks a significant atmospheric gaseous phase, relying primarily on the slow geological weathering of phosphate-bearing rocks."},
            {"id": "B", "text": "Phosphorus evaporates into the upper atmosphere and is permanently lost to space via solar wind stripping."},
            {"id": "C", "text": "Aquatic organisms cannot absorb inorganic phosphate ions across their cellular membranes."},
            {"id": "D", "text": "Denitrifying bacteria actively convert dissolved orthophosphate into toxic insoluble phosphine gas."}
        ],
        "answer": "A",
        "explanation": "Unlike carbon, nitrogen, and sulfur, the phosphorus cycle does not include a stable gaseous atmospheric component. Phosphorus reservoirs reside almost entirely in sedimentary rocks and ocean sediments. Because natural mobilization depends on slow chemical weathering, bioavailable orthophosphate (PO₄³⁻) is naturally scarce in freshwater lakes, making it the primary limiting factor for primary productivity.",
        "distractors": {
            "B": "Phosphorus does not exist as an atmospheric gas under ambient conditions, so it cannot be lost to space.",
            "C": "Aquatic plants and phytoplankton actively absorb dissolved inorganic phosphate (PO₄³⁻).",
            "D": "Denitrification is a nitrogen cycle process, not a phosphorus cycle reaction."
        }
    },
    "u1-q07": {
        "tier": "Exam level",
        "topic": "1.6 The Carbon Cycle and Ocean Acidification",
        "stimulus": None,
        "stem": "Over the past century, increased combustion of fossil fuels has driven atmospheric CO₂ concentrations from 280 ppm to over 420 ppm. Which sequence accurately describes the chemical mechanism of ocean acidification resulting from this carbon flux?",
        "choices": [
            {"id": "A", "text": "CO₂ dissolves in seawater to form carbonic acid (H₂CO₃), which dissociates into hydrogen ions (H⁺) and bicarbonate; the excess H⁺ ions bind to carbonate ions (CO₃²⁻), reducing the carbonate available for marine calcifiers to build calcium carbonate (CaCO₃) shells."},
            {"id": "B", "text": "Excess CO₂ gas reacts with dissolved oxygen, depleting oceanic oxygen and suffocating benthic organisms while raising ocean pH."},
            {"id": "C", "text": "CO₂ combines directly with calcium ions to form insoluble limestone precipitates, lowering ocean salinity."},
            {"id": "D", "text": "Dissolved CO₂ increases ocean surface temperatures, which directly breaks down water molecules into hydroxide ions (OH⁻)."}
        ],
        "answer": "A",
        "explanation": "When atmospheric CO₂ dissolves in seawater: CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻. The released H⁺ ions react with existing carbonate ions: H⁺ + CO₃²⁻ ⇌ HCO₃⁻. This lowers oceanic pH (acidification) and depletes the ambient concentration of carbonate ions (CO₃²⁻), severely hindering corals, pteropods, and shellfish from depositing calcium carbonate (CaCO₃) skeletons.",
        "distractors": {
            "B": "CO₂ does not react with oxygen to raise pH; ocean acidification lowers pH (increases acidity).",
            "C": "Acidification dissolves calcium carbonate structures rather than precipitating limestone.",
            "D": "Acidification increases H⁺ ion concentration, not hydroxide (OH⁻) ions."
        }
    }
}

def apply_upgrades(slug, upgrades_dict):
    files = sorted(glob.glob(f'content/ap/{slug}/unit-*.json'))
    count = 0
    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as fp:
            d = json.load(fp)
        changed = False
        for q in d.get('practice', []):
            qid = q.get('id')
            if qid in upgrades_dict:
                up = upgrades_dict[qid]
                q['tier'] = up.get('tier', q.get('tier'))
                q['topic'] = up.get('topic', q.get('topic'))
                q['stimulus'] = up.get('stimulus')
                q['stem'] = up['stem']
                q['choices'] = up['choices']
                q['answer'] = up['answer']
                q['explanation'] = up['explanation']
                q['distractors'] = up.get('distractors', {})
                changed = True
                count += 1
        if changed:
            with open(fpath, 'w', encoding='utf-8') as fp:
                json.dump(d, fp, indent=2, ensure_ascii=False)
                fp.write('\n')
    print(f"[{slug}] Upgraded {count} questions.")

def main():
    apply_upgrades('us-history', USH_UPGRADES)
    apply_upgrades('macroeconomics', ECON_UPGRADES)
    apply_upgrades('microeconomics', ECON_UPGRADES)
    apply_upgrades('environmental', ENV_UPGRADES)

if __name__ == '__main__':
    main()
