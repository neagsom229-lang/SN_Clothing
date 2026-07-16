import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/format';
import {
  PAYMENT_METHODS,
  EXPRESS_CARRIERS,
  PROVINCES,
  getPayment,
  getCarrier,
  buildPaymentPayload,
} from '../data/checkout';

export default function Checkout() {
  const { detailed, subtotal, clear } = useCart();
  const { user, placeOrder } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: '',
    province: '',
    addressLine: '',
    carrier: 'jt',
    payment: 'aba',
  });
  const [errors, setErrors] = useState({});

  // Stable reference used inside the payment QR (before the order exists).
  const payRef = useMemo(
    () => `W401-${Math.floor(100000 + Math.random() * 900000)}`,
    []
  );

  if (detailed.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  const carrier = getCarrier(form.carrier);
  const payment = getPayment(form.payment);
  const shipping = carrier.fee;
  const total = subtotal + shipping;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Recipient name is required.';
    if (!/^[0-9+\-\s]{6,}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number.';
    if (!form.province) e.province = 'Please choose a province / city.';
    if (!form.addressLine.trim()) e.addressLine = 'Street / house address is required.';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const items = detailed.map(({ product, size, qty, lineTotal }) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: product.price,
      size,
      qty,
      lineTotal,
    }));

    const order = placeOrder({
      items,
      subtotal,
      shipping,
      total,
      payment: { key: payment.key, label: payment.label },
      express: { carrier: carrier.carrier, fee: carrier.fee, eta: carrier.eta },
      address: {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        province: form.province,
        addressLine: form.addressLine.trim(),
      },
    });

    clear();
    navigate(`/order/${order.id}`);
  };

  const qrValue = buildPaymentPayload({
    bankLabel: payment.label,
    amount: total,
    reference: payRef,
  });

  return (
    <main className="flex-shrink-0">
      <Container className="py-5">
        <h1 className="fw-bolder mb-4">Checkout</h1>
        <Form noValidate onSubmit={handleSubmit}>
          <Row className="gx-4">
            <Col lg={7} className="mb-4">
              {/* Delivery details */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                  <h5 className="fw-bolder mb-3">
                    <i className="bi bi-geo-alt me-2 text-primary" />
                    Delivery details
                  </h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Recipient name</Form.Label>
                      <Form.Control
                        value={form.fullName}
                        onChange={set('fullName')}
                        isInvalid={!!errors.fullName}
                        placeholder="Full name"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.fullName}
                      </Form.Control.Feedback>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Phone number</Form.Label>
                      <Form.Control
                        value={form.phone}
                        onChange={set('phone')}
                        isInvalid={!!errors.phone}
                        placeholder="0XX XXX XXX"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Province / City</Form.Label>
                      <Form.Select
                        value={form.province}
                        onChange={set('province')}
                        isInvalid={!!errors.province}
                      >
                        <option value="">Select location…</option>
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.province}
                      </Form.Control.Feedback>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Street / house address</Form.Label>
                      <Form.Control
                        value={form.addressLine}
                        onChange={set('addressLine')}
                        isInvalid={!!errors.addressLine}
                        placeholder="House no, street, sangkat…"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.addressLine}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Express carrier */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                  <h5 className="fw-bolder mb-3">
                    <i className="bi bi-truck me-2 text-primary" />
                    Delivery / express
                  </h5>
                  <Row className="g-3">
                    {EXPRESS_CARRIERS.map((c) => (
                      <Col md={4} key={c.key}>
                        <label
                          className={`option-tile w-100 h-100${
                            form.carrier === c.key ? ' is-selected' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="carrier"
                            className="d-none"
                            checked={form.carrier === c.key}
                            onChange={() => setForm((f) => ({ ...f, carrier: c.key }))}
                          />
                          <img
                            src={c.logo}
                            alt={`${c.carrier} logo`}
                            className="brand-logo d-block mx-auto mb-2"
                          />
                          <span className="fw-semibold d-block">{c.carrier}</span>
                          <span className="text-muted small d-block">{c.eta}</span>
                          <span className="text-primary small">{formatPrice(c.fee)}</span>
                        </label>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>

              {/* Payment method */}
              <Card className="border-0 shadow-sm">
                <Card.Body>
                  <h5 className="fw-bolder mb-3">
                    <i className="bi bi-credit-card me-2 text-primary" />
                    Payment method
                  </h5>
                  <Row className="g-3">
                    {PAYMENT_METHODS.map((m) => (
                      <Col xs={6} md={3} key={m.key}>
                        <label
                          className={`option-tile w-100 h-100${
                            form.payment === m.key ? ' is-selected' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            className="d-none"
                            checked={form.payment === m.key}
                            onChange={() => setForm((f) => ({ ...f, payment: m.key }))}
                          />
                          {m.logo ? (
                            <img
                              src={m.logo}
                              alt={`${m.label} logo`}
                              className="brand-logo mx-auto"
                            />
                          ) : (
                            <i className={`bi ${m.icon} brand-logo-icon`} />
                          )}
                          <span className="fw-semibold d-block mt-2">{m.label}</span>
                        </label>
                      </Col>
                    ))}
                  </Row>

                  {/* QR for bank / wallet payments */}
                  {payment.qr ? (
                    <div className="text-center mt-4 p-4 border rounded-3 bg-light">
                      <p className="fw-semibold mb-1">
                        Scan to pay with {payment.label}
                      </p>
                      <p className="text-muted small mb-3">{payment.hint}</p>
                      <div
                        className="d-inline-block bg-white p-3 rounded-3 shadow-sm"
                        style={{ borderTop: `6px solid ${payment.color}` }}
                      >
                        <QRCodeSVG
                          value={qrValue}
                          size={188}
                          level="M"
                          fgColor={payment.color}
                        />
                        <div className="fw-bold mt-2" style={{ color: payment.color }}>
                          {payment.label}
                        </div>
                        <div className="small text-muted">
                          {formatPrice(total)} · Ref {payRef}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-secondary mt-4 mb-0">
                      <i className="bi bi-cash-coin me-2" />
                      You'll pay <strong>{formatPrice(total)}</strong> in cash when your
                      order is delivered.
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Order summary */}
            <Col lg={5}>
              <Card className="border-0 shadow-sm sticky-lg-top" style={{ top: '90px' }}>
                <Card.Body>
                  <h5 className="fw-bolder mb-3">Your order</h5>
                  {detailed.map(({ key, size, qty, product, lineTotal }) => (
                    <div
                      key={key}
                      className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        width={44}
                        height={34}
                        className="rounded"
                        style={{ objectFit: 'cover' }}
                      />
                      <div className="flex-grow-1 small">
                        <div className="fw-semibold">{product.name}</div>
                        <div className="text-muted">
                          {qty} × {formatPrice(product.price)}
                          {size && <span> · Size {size}</span>}
                        </div>
                      </div>
                      <div className="small fw-semibold">{formatPrice(lineTotal)}</div>
                    </div>
                  ))}

                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">
                      Shipping · {carrier.carrier}
                    </span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-3">
                    <span className="fw-bolder fs-5">Total</span>
                    <span className="fw-bolder fs-5">{formatPrice(total)}</span>
                  </div>

                  <div className="d-grid">
                    <Button type="submit" variant="primary" size="lg">
                      <i className="bi bi-shield-lock me-2" />
                      Place order
                    </Button>
                  </div>
                  <p className="text-muted small text-center mt-2 mb-0">
                    Signed in as {user.email}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
      </Container>
    </main>
  );
}
