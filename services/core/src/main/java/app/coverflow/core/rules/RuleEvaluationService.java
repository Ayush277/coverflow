package app.coverflow.core.rules;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Repository
interface BenefitRuleRepository extends JpaRepository<BenefitRule, String> {
    List<BenefitRule> findByActiveTrue();
}

/**
 * Benefit Decision Engine — evaluates a transaction against every active rule
 * and returns matches with an explainable decision trace. Pure function of
 * (transaction, rules); identical semantics to the gateway implementation.
 */
@Service
public class RuleEvaluationService {

    public record Transaction(String merchant, String category, String country,
                              String cardTier, BigDecimal amount) {}

    public record TraceStep(String check, boolean pass, String detail) {}

    public record Match(BenefitRule rule, List<TraceStep> trace) {}

    private final BenefitRuleRepository rules;
    private final ObjectMapper mapper = new ObjectMapper();

    public RuleEvaluationService(BenefitRuleRepository rules) {
        this.rules = rules;
    }

    public List<Match> evaluate(Transaction txn) {
        List<Match> matches = new ArrayList<>();
        for (BenefitRule rule : rules.findByActiveTrue()) {
            List<TraceStep> trace = new ArrayList<>();
            boolean ok = step(trace, "card_tier", contains(rule.getCardTiers(), txn.cardTier()),
                          txn.cardTier() + " vs " + rule.getCardTiers())
                    && step(trace, "category", contains(rule.getCategories(), txn.category()),
                          txn.category() + " vs " + rule.getCategories())
                    && step(trace, "country", contains(rule.getCountries(), txn.country()),
                          txn.country() + " vs " + rule.getCountries())
                    && step(trace, "min_amount", txn.amount().compareTo(rule.getMinAmount()) >= 0,
                          txn.amount() + " >= " + rule.getMinAmount())
                    && step(trace, "max_amount", rule.getMaxAmount() == null
                              || txn.amount().compareTo(rule.getMaxAmount()) <= 0,
                          txn.amount() + " <= " + (rule.getMaxAmount() == null ? "∞" : rule.getMaxAmount()))
                    && step(trace, "exclusions", notExcluded(rule.getExclusions(), txn.merchant()),
                          "merchant " + txn.merchant() + " not excluded");
            if (ok) matches.add(new Match(rule, trace));
        }
        return matches;
    }

    private boolean step(List<TraceStep> trace, String check, boolean pass, String detail) {
        trace.add(new TraceStep(check, pass, detail));
        return pass;
    }

    private boolean contains(String jsonArray, String value) {
        List<String> values = parse(jsonArray);
        return values.contains("*") || values.contains(value);
    }

    private boolean notExcluded(String jsonArray, String merchant) {
        return parse(jsonArray).stream().noneMatch(e -> merchant.toLowerCase().contains(e.toLowerCase()));
    }

    private List<String> parse(String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
