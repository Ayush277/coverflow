package app.coverflow.core.rules;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "benefit_rules")
public class BenefitRule {

    public enum Decision { AUTO, REMINDER, MANUAL }

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "benefit_type", nullable = false)
    private String benefitType;

    @Column(nullable = false, length = 2000)
    private String description;

    /** JSON arrays stored as text — mirrors the gateway schema exactly. */
    @Column(name = "card_tiers", nullable = false)
    private String cardTiers;

    @Column(nullable = false)
    private String categories;

    @Column(nullable = false)
    private String countries;

    @Column(name = "min_amount", nullable = false)
    private BigDecimal minAmount = BigDecimal.ZERO;

    @Column(name = "max_amount")
    private BigDecimal maxAmount;

    @Column(name = "coverage_days", nullable = false)
    private int coverageDays;

    @Column(name = "coverage_limit", nullable = false)
    private BigDecimal coverageLimit;

    @Column(name = "claim_window_days", nullable = false)
    private int claimWindowDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Decision decision = Decision.AUTO;

    @Column(nullable = false)
    private String exclusions = "[]";

    @Column(nullable = false)
    private int version = 1;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected BenefitRule() {}

    // getters/setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getBenefitType() { return benefitType; }
    public void setBenefitType(String benefitType) { this.benefitType = benefitType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCardTiers() { return cardTiers; }
    public void setCardTiers(String cardTiers) { this.cardTiers = cardTiers; }
    public String getCategories() { return categories; }
    public void setCategories(String categories) { this.categories = categories; }
    public String getCountries() { return countries; }
    public void setCountries(String countries) { this.countries = countries; }
    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }
    public BigDecimal getMaxAmount() { return maxAmount; }
    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }
    public int getCoverageDays() { return coverageDays; }
    public void setCoverageDays(int coverageDays) { this.coverageDays = coverageDays; }
    public BigDecimal getCoverageLimit() { return coverageLimit; }
    public void setCoverageLimit(BigDecimal coverageLimit) { this.coverageLimit = coverageLimit; }
    public int getClaimWindowDays() { return claimWindowDays; }
    public void setClaimWindowDays(int claimWindowDays) { this.claimWindowDays = claimWindowDays; }
    public Decision getDecision() { return decision; }
    public void setDecision(Decision decision) { this.decision = decision; }
    public String getExclusions() { return exclusions; }
    public void setExclusions(String exclusions) { this.exclusions = exclusions; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void touch() { this.updatedAt = Instant.now(); this.version++; }
}
