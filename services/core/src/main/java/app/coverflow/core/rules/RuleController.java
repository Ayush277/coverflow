package app.coverflow.core.rules;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/core/rules")
public class RuleController {

    private final RuleEvaluationService evaluator;

    public RuleController(RuleEvaluationService evaluator) {
        this.evaluator = evaluator;
    }

    public record EvaluateRequest(@NotNull String merchant, @NotNull String category,
                                  @NotNull String country, @NotNull String cardTier,
                                  @NotNull BigDecimal amount) {}

    /** POST /core/rules/evaluate — Decision Engine as a service. */
    @PostMapping("/evaluate")
    public Map<String, Object> evaluate(@Valid @RequestBody EvaluateRequest req) {
        if (req.amount().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "amount must be positive");
        }
        List<RuleEvaluationService.Match> matches = evaluator.evaluate(
                new RuleEvaluationService.Transaction(req.merchant(), req.category(),
                        req.country(), req.cardTier(), req.amount()));
        return Map.of(
                "matches", matches.stream().map(m -> Map.of(
                        "ruleId", m.rule().getId(),
                        "name", m.rule().getName(),
                        "benefitType", m.rule().getBenefitType(),
                        "decision", m.rule().getDecision().name(),
                        "coverageDays", m.rule().getCoverageDays(),
                        "coverageLimit", m.rule().getCoverageLimit(),
                        "claimWindowDays", m.rule().getClaimWindowDays(),
                        "trace", m.trace())).toList());
    }
}
