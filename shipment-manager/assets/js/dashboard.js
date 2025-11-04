// Shipment Manager Dashboard JavaScript

class ShipmentManager {
    constructor() {
        this.shipments = [];
        this.orders = [];
        this.holdingArea = [];
        this.settings = {
            maxCapacity: 1000, // kg
            maxVolume: 10, // m³
            upcomingShipments: 2,
            displayMode: 'weight' // 'weight' or 'volume'
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.loadShipments();
        this.loadOrders();
        this.initDragAndDrop();
        this.initEventListeners();
        this.renderDashboard();
    }

    // Load settings from localStorage or API
    loadSettings() {
        const savedSettings = localStorage.getItem('shipmentManagerSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    // Load shipments data
    loadShipments() {
        // For demo purposes, create sample shipments
        this.shipments = [
            {
                id: 1,
                name: 'Shipment #001',
                maxCapacity: this.settings.maxCapacity,
                currentCapacity: 0,
                maxVolume: this.settings.maxVolume,
                currentVolume: 0,
                status: 'pending',
                orders: [],
                dispatchDate: null,
                expectedDelivery: null
            },
            {
                id: 2,
                name: 'Shipment #002',
                maxCapacity: this.settings.maxCapacity,
                currentCapacity: 0,
                maxVolume: this.settings.maxVolume,
                currentVolume: 0,
                status: 'pending',
                orders: [],
                dispatchDate: null,
                expectedDelivery: null
            }
        ];
    }

    // Load orders data
    loadOrders() {
        // For demo purposes, create sample orders
        this.orders = [
            {
                id: 1,
                orderId: 'ORD-001',
                customerName: 'John Doe',
                customerEmail: 'john@example.com',
                weight: 25.5,
                volume: 0.5,
                priority: 2,
                status: 'pending',
                shipmentId: null
            },
            {
                id: 2,
                orderId: 'ORD-002',
                customerName: 'Jane Smith',
                customerEmail: 'jane@example.com',
                weight: 15.2,
                volume: 0.3,
                priority: 3,
                status: 'pending',
                shipmentId: null
            }
        ];
    }

    // Initialize drag and drop functionality
    initDragAndDrop() {
        // Make orders draggable
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('order-item')) {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', e.target.dataset.orderId);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('order-item')) {
                e.target.classList.remove('dragging');
            }
        });

        // Handle drop zones
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dropZone = e.target.closest('.orders-container, .holding-area');
            if (dropZone) {
                dropZone.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const dropZone = e.target.closest('.orders-container, .holding-area');
            if (dropZone) {
                dropZone.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropZone = e.target.closest('.orders-container, .holding-area');
            if (dropZone) {
                dropZone.classList.remove('drag-over');
                const orderId = e.dataTransfer.getData('text/plain');
                this.handleOrderDrop(orderId, dropZone);
            }
        });
    }

    // Handle order drop
    handleOrderDrop(orderId, dropZone) {
        const order = this.orders.find(o => o.orderId === orderId);
        if (!order) return;

        if (dropZone.classList.contains('holding-area')) {
            // Move to holding area
            this.moveOrderToHolding(orderId);
        } else {
            // Move to shipment
            const shipmentId = parseInt(dropZone.dataset.shipmentId);
            this.moveOrderToShipment(orderId, shipmentId);
        }

        this.renderDashboard();
        this.showToast('Order moved successfully!', 'success');
    }

    // Initialize event listeners
    initEventListeners() {
        // Add order button
        document.getElementById('saveOrderBtn').addEventListener('click', () => {
            this.addNewOrder();
        });

        // Dispatch shipment buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('dispatch-shipment')) {
                const shipmentId = parseInt(e.target.dataset.shipmentId);
                this.dispatchShipment(shipmentId);
            }
        });

        // Delete order buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-order')) {
                const orderId = e.target.dataset.orderId;
                this.deleteOrder(orderId);
            }
        });
    }

    // Add new order
    addNewOrder() {
        const form = document.getElementById('addOrderForm');
        const formData = new FormData(form);
        
        const order = {
            id: this.orders.length + 1,
            orderId: document.getElementById('orderId').value,
            customerName: document.getElementById('customerName').value,
            customerEmail: document.getElementById('customerEmail').value,
            weight: parseFloat(document.getElementById('orderWeight').value),
            volume: parseFloat(document.getElementById('orderVolume').value),
            priority: parseInt(document.getElementById('orderPriority').value),
            status: 'pending',
            shipmentId: null
        };

        // Validate order
        if (!this.validateOrder(order)) {
            return;
        }

        this.orders.push(order);
        this.autoAssignOrder(order);
        
        // Reset form and close modal
        form.reset();
        bootstrap.Modal.getInstance(document.getElementById('addOrderModal')).hide();
        
        this.renderDashboard();
        this.showToast('Order added successfully!', 'success');
    }

    // Validate order
    validateOrder(order) {
        if (!order.orderId || !order.customerName || !order.customerEmail) {
            this.showToast('Please fill in all required fields', 'error');
            return false;
        }

        if (order.weight <= 0 || order.volume <= 0) {
            this.showToast('Weight and volume must be greater than 0', 'error');
            return false;
        }

        if (this.orders.some(o => o.orderId === order.orderId)) {
            this.showToast('Order ID already exists', 'error');
            return false;
        }

        return true;
    }

    // Auto-assign order to shipment
    autoAssignOrder(order) {
        // Find the first shipment with available capacity
        for (let shipment of this.shipments) {
            if (this.canAddOrderToShipment(order, shipment)) {
                order.shipmentId = shipment.id;
                shipment.orders.push(order);
                this.updateShipmentCapacity(shipment);
                return;
            }
        }

        // If no shipment has capacity, create a new one
        this.createNewShipment();
        this.autoAssignOrder(order);
    }

    // Check if order can be added to shipment
    canAddOrderToShipment(order, shipment) {
        const newWeight = shipment.currentCapacity + order.weight;
        const newVolume = shipment.currentVolume + order.volume;
        
        return newWeight <= shipment.maxCapacity && newVolume <= shipment.maxVolume;
    }

    // Create new shipment
    createNewShipment() {
        const newShipment = {
            id: this.shipments.length + 1,
            name: `Shipment #${String(this.shipments.length + 1).padStart(3, '0')}`,
            maxCapacity: this.settings.maxCapacity,
            currentCapacity: 0,
            maxVolume: this.settings.maxVolume,
            currentVolume: 0,
            status: 'pending',
            orders: [],
            dispatchDate: null,
            expectedDelivery: null
        };
        
        this.shipments.push(newShipment);
    }

    // Move order to holding area
    moveOrderToHolding(orderId) {
        const order = this.orders.find(o => o.orderId === orderId);
        if (!order) return;

        // Remove from current shipment
        if (order.shipmentId) {
            const shipment = this.shipments.find(s => s.id === order.shipmentId);
            if (shipment) {
                shipment.orders = shipment.orders.filter(o => o.orderId !== orderId);
                this.updateShipmentCapacity(shipment);
            }
            order.shipmentId = null;
        }

        // Add to holding area
        if (!this.holdingArea.find(o => o.orderId === orderId)) {
            this.holdingArea.push(order);
        }
    }

    // Move order to shipment
    moveOrderToShipment(orderId, shipmentId) {
        const order = this.orders.find(o => o.orderId === orderId);
        const shipment = this.shipments.find(s => s.id === shipmentId);
        
        if (!order || !shipment) return;

        // Check capacity
        if (!this.canAddOrderToShipment(order, shipment)) {
            this.showToast('Shipment is at full capacity', 'error');
            return;
        }

        // Remove from holding area
        this.holdingArea = this.holdingArea.filter(o => o.orderId !== orderId);

        // Remove from current shipment
        if (order.shipmentId) {
            const currentShipment = this.shipments.find(s => s.id === order.shipmentId);
            if (currentShipment) {
                currentShipment.orders = currentShipment.orders.filter(o => o.orderId !== orderId);
                this.updateShipmentCapacity(currentShipment);
            }
        }

        // Add to new shipment
        order.shipmentId = shipmentId;
        shipment.orders.push(order);
        this.updateShipmentCapacity(shipment);
    }

    // Update shipment capacity
    updateShipmentCapacity(shipment) {
        shipment.currentCapacity = shipment.orders.reduce((sum, order) => sum + order.weight, 0);
        shipment.currentVolume = shipment.orders.reduce((sum, order) => sum + order.volume, 0);
    }

    // Delete order
    deleteOrder(orderId) {
        if (confirm('Are you sure you want to delete this order?')) {
            const order = this.orders.find(o => o.orderId === orderId);
            if (order) {
                // Remove from shipment
                if (order.shipmentId) {
                    const shipment = this.shipments.find(s => s.id === order.shipmentId);
                    if (shipment) {
                        shipment.orders = shipment.orders.filter(o => o.orderId !== orderId);
                        this.updateShipmentCapacity(shipment);
                    }
                }

                // Remove from holding area
                this.holdingArea = this.holdingArea.filter(o => o.orderId !== orderId);

                // Remove from orders
                this.orders = this.orders.filter(o => o.orderId !== orderId);

                this.renderDashboard();
                this.showToast('Order deleted successfully!', 'success');
            }
        }
    }

    // Dispatch shipment
    dispatchShipment(shipmentId) {
        const shipment = this.shipments.find(s => s.id === shipmentId);
        if (!shipment || shipment.orders.length === 0) {
            this.showToast('Cannot dispatch empty shipment', 'error');
            return;
        }

        if (confirm(`Are you sure you want to dispatch ${shipment.name}?`)) {
            shipment.status = 'dispatched';
            shipment.dispatchDate = new Date();
            shipment.expectedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

            // Update order statuses
            shipment.orders.forEach(order => {
                order.status = 'dispatched';
            });

            // Create new shipment to replace the dispatched one
            this.createNewShipment();

            this.renderDashboard();
            this.showToast(`${shipment.name} dispatched successfully!`, 'success');
        }
    }

    // Render dashboard
    renderDashboard() {
        this.renderShipments();
        this.renderHoldingArea();
        this.updateStatistics();
        this.initializeTooltips();
    }

    // Render shipments
    renderShipments() {
        const container = document.getElementById('shipmentContainer');
        container.innerHTML = '';

        // Show only upcoming shipments based on settings
        const upcomingShipments = this.shipments
            .filter(s => s.status === 'pending')
            .slice(0, this.settings.upcomingShipments);

        upcomingShipments.forEach(shipment => {
            const shipmentElement = this.createShipmentElement(shipment);
            container.appendChild(shipmentElement);
        });
    }

    // Create shipment element
    createShipmentElement(shipment) {
        const div = document.createElement('div');
        div.className = 'shipment-bar';

        div.innerHTML = `
            <div class="shipment-header">
                <h5 class="shipment-title">${shipment.name}</h5>
                <div class="shipment-actions">
                    <button class="btn btn-sm btn-success dispatch-shipment" data-shipment-id="${shipment.id}">
                        <i class="fas fa-paper-plane"></i> Dispatch
                    </button>
                </div>
            </div>
            <div class="shipment-content">
                <div class="orders-container" data-shipment-id="${shipment.id}">
                    ${this.renderOrdersInShipment(shipment)}
                </div>
            </div>
        `;

        return div;
    }

    // Render orders in shipment
    renderOrdersInShipment(shipment) {
        if (shipment.orders.length === 0) {
            return '<p class="text-muted text-center py-4"><i class="fas fa-box-open"></i> No orders assigned</p>';
        }

        return shipment.orders
            .sort((a, b) => b.priority - a.priority)
            .map(order => this.createOrderElement(order, shipment))
            .join('');
    }

    // Create order element
    createOrderElement(order, shipment = null) {
        const priorityClass = this.getPriorityClass(order.priority);
        const priorityText = this.getPriorityText(order.priority);

        // Calculate percentage width based on displayMode
        let percentageWidth = 2; // default fallback
        if (shipment) {
            let totalCapacity;
            let orderSize;

            if (this.settings.displayMode === 'weight') {
                // Calculate total weight in shipment
                totalCapacity = Array.isArray(shipment.orders)
                    ? shipment.orders.reduce((sum, o) => sum + o.weight, 0)
                    : 0;
                orderSize = order.weight;
            } else {
                // Calculate total volume in shipment
                totalCapacity = Array.isArray(shipment.orders)
                    ? shipment.orders.reduce((sum, o) => sum + o.volume, 0)
                    : 0;
                orderSize = order.volume;
            }

            // Calculate percentage relative to total in shipment
            if (totalCapacity > 0) {
                percentageWidth = (orderSize / totalCapacity) * 100;
            } else {
                percentageWidth = 100 / (shipment.orders ? shipment.orders.length : 1);
            }

            // Round to 1 decimal place for better precision
            percentageWidth = Math.round(percentageWidth * 10) / 10;
        }
        // Ensure at least 2% for visibility, but respect actual percentage if larger
        percentageWidth = Math.max(2, percentageWidth);

        // Create tooltip content
        const tooltipContent = `Order #${order.orderId}<br>Customer: ${order.customerName}<br>Weight: ${order.weight}kg<br>Volume: ${order.volume}m³<br>Priority: ${priorityText}`;

        return `
            <div class="order-item" draggable="true" data-order-id="${order.orderId}" style="width: ${percentageWidth}%;"
                 data-bs-toggle="tooltip" data-bs-placement="top" data-bs-html="true" title="${tooltipContent}">
                <div class="order-header">
                    <span class="order-id">${order.orderId}</span>
                    <span class="order-priority ${priorityClass}">${priorityText}</span>
                </div>
                <div class="order-details">
                    <div><strong>${order.customerName}</strong></div>
                    <div>${order.weight}kg | ${order.volume}m³</div>
                </div>
                <div class="order-actions">
                    <button class="btn btn-sm btn-danger delete-order" data-order-id="${order.orderId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Render holding area
    renderHoldingArea() {
        const container = document.getElementById('holdingArea');
        const countElement = document.getElementById('holdingCount');

        countElement.textContent = this.holdingArea.length;

        if (this.holdingArea.length === 0) {
            container.innerHTML = `
                <p class="text-muted text-center py-4">
                    <i class="fas fa-inbox fa-3x mb-3"></i><br>
                    Drag orders here to temporarily hold them
                </p>
            `;
        } else {
            // Create a virtual shipment object for sizing calculations in holding area
            const holdingShipment = {
                maxCapacity: this.settings.maxCapacity,
                maxVolume: this.settings.maxVolume
            };

            container.innerHTML = this.holdingArea
                .sort((a, b) => b.priority - a.priority)
                .map(order => this.createOrderElement(order, holdingShipment))
                .join('');
        }

        if (this.holdingArea.length > 0) {
            container.classList.add('has-items');
        } else {
            container.classList.remove('has-items');
        }
    }

    // Update statistics
    updateStatistics() {
        document.getElementById('totalOrders').textContent = this.orders.length;
        document.getElementById('activeShipments').textContent = this.shipments.filter(s => s.status === 'pending').length;
        document.getElementById('pendingOrders').textContent = this.orders.filter(o => o.status === 'pending').length;
        
        const totalCapacity = this.shipments
            .filter(s => s.status === 'pending')
            .reduce((sum, s) => sum + (s.currentCapacity / s.maxCapacity), 0);
        const avgCapacity = this.shipments.filter(s => s.status === 'pending').length > 0 
            ? Math.round((totalCapacity / this.shipments.filter(s => s.status === 'pending').length) * 100)
            : 0;
        document.getElementById('todayCapacity').textContent = avgCapacity + '%';
    }

    // Initialize tooltips
    initializeTooltips() {
        // Destroy all existing tooltips first
        const allTooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        allTooltips.forEach(el => {
            const tooltip = bootstrap.Tooltip.getInstance(el);
            if (tooltip) {
                tooltip.hide();
                tooltip.dispose();
            }
        });

        // Clear any remaining tooltip elements
        document.querySelectorAll('.tooltip').forEach(el => el.remove());

        // Initialize new tooltips
        setTimeout(() => {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                // Create tooltip with proper options
                new bootstrap.Tooltip(tooltipTriggerEl, {
                    trigger: 'hover',
                    delay: { show: 500, hide: 100 }
                });

                // Hide tooltip on drag start
                tooltipTriggerEl.addEventListener('dragstart', () => {
                    const tooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                    if (tooltip) {
                        tooltip.hide();
                    }
                });
            });
        }, 50);
    }

    // Get priority class
    getPriorityClass(priority) {
        switch (priority) {
            case 1: return 'low';
            case 2: return 'normal';
            case 3: return 'high';
            case 4: return 'urgent';
            default: return 'normal';
        }
    }

    // Get priority text
    getPriorityText(priority) {
        switch (priority) {
            case 1: return 'Low';
            case 2: return 'Normal';
            case 3: return 'High';
            case 4: return 'Urgent';
            default: return 'Normal';
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast show bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} text-white`;
        toast.innerHTML = `
            <div class="toast-body">
                ${message}
            </div>
        `;

        toastContainer.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.shipmentManager = new ShipmentManager();
}); 