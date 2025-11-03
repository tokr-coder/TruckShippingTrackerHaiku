// Settings Modal JavaScript - Enhanced for Single Page App

class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        this.initEventListeners();
        this.initWooCommerceToggle();
    }

    // Initialize event listeners
    initEventListeners() {
        // WooCommerce enable/disable toggle
        const wooCommerceToggle = document.getElementById('wooCommerceEnabled');
        if (wooCommerceToggle) {
            wooCommerceToggle.addEventListener('change', (e) => {
                this.toggleWooCommerceFields(e.target.checked);
            });
        }

        // Auto-assignment strategy change
        const assignmentStrategy = document.getElementById('assignmentStrategy');
        if (assignmentStrategy) {
            assignmentStrategy.addEventListener('change', (e) => {
                this.updateStrategyDescription(e.target.value);
            });
        }

        // Capacity warnings toggle
        const capacityWarnings = document.getElementById('capacityWarnings');
        if (capacityWarnings) {
            capacityWarnings.addEventListener('change', (e) => {
                this.toggleWarningThreshold(e.target.checked);
            });
        }

        // Email notifications toggle
        const emailNotifications = document.getElementById('emailNotifications');
        if (emailNotifications) {
            emailNotifications.addEventListener('change', (e) => {
                this.toggleEmailFields(e.target.checked);
            });
        }
    }

    // Toggle WooCommerce fields visibility
    toggleWooCommerceFields(enabled) {
        const fields = [
            'wooCommerceUrl',
            'wooCommerceKey', 
            'wooCommerceSecret',
            'syncInterval',
            'autoSyncOrders'
        ];

        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                const formGroup = field.closest('.mb-3');
                if (formGroup) {
                    formGroup.style.display = enabled ? 'block' : 'none';
                }
            }
        });

        // Update test button state
        const testButton = document.getElementById('testWooCommerce');
        if (testButton) {
            testButton.disabled = !enabled;
        }
    }

    // Toggle warning threshold field
    toggleWarningThreshold(enabled) {
        const thresholdField = document.getElementById('warningThreshold');
        if (thresholdField) {
            const formGroup = thresholdField.closest('.mb-3');
            if (formGroup) {
                formGroup.style.display = enabled ? 'block' : 'none';
            }
        }
    }

    // Toggle email notification fields
    toggleEmailFields(enabled) {
        const emailField = document.getElementById('notificationEmail');
        if (emailField) {
            const formGroup = emailField.closest('.mb-3');
            if (formGroup) {
                formGroup.style.display = enabled ? 'block' : 'none';
            }
        }
    }

    // Update strategy description
    updateStrategyDescription(strategy) {
        const descriptions = {
            'first_available': 'Assign orders to the first shipment with available capacity',
            'best_fit': 'Find the shipment that best fits the order size and priority',
            'priority_based': 'Prioritize shipments based on order priority and delivery dates'
        };

        const descriptionElement = document.querySelector('.assignment-strategy-description');
        if (descriptionElement) {
            descriptionElement.textContent = descriptions[strategy] || descriptions['first_available'];
        }
    }

    // Initialize WooCommerce toggle state
    initWooCommerceToggle() {
        const wooCommerceEnabled = document.getElementById('wooCommerceEnabled');
        if (wooCommerceEnabled) {
            this.toggleWooCommerceFields(wooCommerceEnabled.checked);
        }

        const capacityWarnings = document.getElementById('capacityWarnings');
        if (capacityWarnings) {
            this.toggleWarningThreshold(capacityWarnings.checked);
        }

        const emailNotifications = document.getElementById('emailNotifications');
        if (emailNotifications) {
            this.toggleEmailFields(emailNotifications.checked);
        }

        const assignmentStrategy = document.getElementById('assignmentStrategy');
        if (assignmentStrategy) {
            this.updateStrategyDescription(assignmentStrategy.value);
        }
    }

    // Validate form before submission
    validateForm() {
        const form = document.getElementById('settingsForm');
        const formData = new FormData(form);
        const errors = [];

        // Validate capacity settings
        const maxCapacity = parseFloat(formData.get('maxCapacity'));
        const maxVolume = parseFloat(formData.get('maxVolume'));
        
        if (maxCapacity <= 0) {
            errors.push('Maximum capacity must be greater than 0');
        }
        
        if (maxVolume <= 0) {
            errors.push('Maximum volume must be greater than 0');
        }

        // Validate warning threshold
        const warningThreshold = parseInt(formData.get('warningThreshold'));
        if (warningThreshold < 50 || warningThreshold > 95) {
            errors.push('Warning threshold must be between 50% and 95%');
        }

        // Validate WooCommerce settings if enabled
        const wooCommerceEnabled = document.getElementById('wooCommerceEnabled').checked;
        if (wooCommerceEnabled) {
            const url = formData.get('wooCommerceUrl');
            const key = formData.get('wooCommerceKey');
            const secret = formData.get('wooCommerceSecret');

            if (!url) {
                errors.push('WooCommerce URL is required when integration is enabled');
            }
            if (!key || !secret) {
                errors.push('WooCommerce API credentials are required when integration is enabled');
            }
        }

        // Validate email if notifications are enabled
        const emailNotifications = document.getElementById('emailNotifications').checked;
        if (emailNotifications) {
            const email = formData.get('notificationEmail');
            if (!email || !this.isValidEmail(email)) {
                errors.push('Valid notification email is required when email notifications are enabled');
            }
        }

        return errors;
    }

    // Email validation helper
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show validation errors
    showValidationErrors(errors) {
        if (errors.length === 0) return;

        const errorMessage = errors.join('\n');
        if (window.shipmentManagerApp) {
            window.shipmentManagerApp.showNotification(errorMessage, 'error');
        } else {
            alert('Validation errors:\n' + errorMessage);
        }
    }

    // Enhanced form submission handler
    handleFormSubmission(e) {
        e.preventDefault();
        
        const errors = this.validateForm();
        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return false;
        }

        // Let the main app handle the saving
        if (window.shipmentManagerApp) {
            window.shipmentManagerApp.saveSettings();
        }
        
        return true;
    }

    // Real-time validation
    initRealTimeValidation() {
        const inputs = document.querySelectorAll('#settingsForm input, #settingsForm select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    // Validate individual field
    validateField(field) {
        const formGroup = field.closest('.mb-3');
        const existingError = formGroup.querySelector('.validation-error');
        
        if (existingError) {
            existingError.remove();
        }

        let error = null;

        switch (field.id) {
            case 'maxCapacity':
            case 'maxVolume':
                const value = parseFloat(field.value);
                if (value <= 0) {
                    error = `${field.getAttribute('placeholder') || field.name} must be greater than 0`;
                }
                break;
            
            case 'warningThreshold':
                const threshold = parseInt(field.value);
                if (threshold < 50 || threshold > 95) {
                    error = 'Warning threshold must be between 50% and 95%';
                }
                break;
            
            case 'notificationEmail':
                if (field.value && !this.isValidEmail(field.value)) {
                    error = 'Please enter a valid email address';
                }
                break;
            
            case 'wooCommerceUrl':
                if (field.value && !this.isValidUrl(field.value)) {
                    error = 'Please enter a valid URL';
                }
                break;
        }

        if (error) {
            const errorElement = document.createElement('div');
            errorElement.className = 'validation-error text-danger small mt-1';
            errorElement.textContent = error;
            formGroup.appendChild(errorElement);
            field.classList.add('is-invalid');
        } else {
            field.classList.remove('is-invalid');
        }
    }

    // URL validation helper
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

// Initialize when settings modal is shown
document.addEventListener('DOMContentLoaded', () => {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.addEventListener('shown.bs.modal', () => {
            if (window.settingsManager) {
                window.settingsManager.initRealTimeValidation();
                window.settingsManager.initWooCommerceToggle();
            }
        });
    }
}); 