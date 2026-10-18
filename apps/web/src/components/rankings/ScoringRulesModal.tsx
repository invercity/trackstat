'use client';

import { Alert, Button, Col, Modal, Row, Table } from 'react-bootstrap';

interface ScoringRulesModalProps {
  show: boolean;
  onHide: () => void;
}

export default function ScoringRulesModal({ show, onHide }: ScoringRulesModalProps) {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0 d-flex align-items-center gap-2">
          <span>💡</span>
          <span>Критерії та шкала нарахування очок рейтингу</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="small">
        <Alert variant="info" className="py-2 px-3 mb-3">
          <div>
            <strong>Основний принцип:</strong> Для визначення кращого спортсмена року в кожній віковій категорії до заліку беруться <strong>до 5 кращих результатів</strong> на протязі календарного року (стадіон + манеж). Рейтинг спортивних шкіл підсумовується як сума очок усіх її вихованців.
          </div>
          <hr className="my-2" />
          <div>
            <strong>Визначення та періоди спортивних сезонів:</strong>
            <ul className="mb-0 mt-1 ps-3">
              <li><strong>Сезон outdoor (стадіон):</strong> триває з 1 квітня по 31 жовтня (поточний рік).</li>
              <li><strong>Сезон indoor (манеж):</strong> триває з 1 листопада по 31 березня.</li>
              <li><em>Листопад та грудень поточного року відносяться до indoor сезону наступного року</em> (наприклад, листопад 2026 відноситься до зимового сезону <code>2027 (i)</code>).</li>
            </ul>
          </div>
        </Alert>

        <h6 className="fw-bold text-primary mb-2">1. Очки за зайняті місця на змаганнях області (Чемпіонат області):</h6>
        <div className="table-responsive mb-3">
          <Table bordered size="sm" className="text-center small mb-0">
            <thead className="table-light">
              <tr>
                <th>Категорія</th>
                <th>1 м.</th>
                <th>2 м.</th>
                <th>3 м.</th>
                <th>4 м.</th>
                <th>5 м.</th>
                <th>6 м.</th>
                <th>7 м.</th>
                <th>8 м.</th>
                <th>9 м.</th>
                <th>10 м.</th>
                <th>11 м.</th>
                <th>12 м.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-bold text-start">Дорослі</td>
                <td>60</td><td>50</td><td>45</td><td>40</td><td>35</td><td>30</td><td>27</td><td>25</td><td>23</td><td>21</td><td>19</td><td>16</td>
              </tr>
              <tr>
                <td className="fw-bold text-start">Молодь (U23)</td>
                <td>50</td><td>45</td><td>40</td><td>35</td><td>30</td><td>27</td><td>25</td><td>23</td><td>21</td><td>19</td><td>16</td><td>14</td>
              </tr>
              <tr>
                <td className="fw-bold text-start">Юніори (U20)</td>
                <td>45</td><td>40</td><td>35</td><td>30</td><td>27</td><td>25</td><td>23</td><td>21</td><td>19</td><td>16</td><td>14</td><td>12</td>
              </tr>
              <tr>
                <td className="fw-bold text-start">Юнаки (U18, U16)</td>
                <td>40</td><td>35</td><td>30</td><td>27</td><td>25</td><td>23</td><td>21</td><td>19</td><td>16</td><td>14</td><td>12</td><td>10</td>
              </tr>
            </tbody>
          </Table>
        </div>

        <h6 className="fw-bold text-primary mb-2">2. Очки на Чемпіонаті України:</h6>
        <div className="table-responsive mb-3">
          <Table bordered size="sm" className="text-center small mb-0">
            <thead className="table-light">
              <tr>
                <th>Категорія</th>
                <th>1 м.</th>
                <th>2 м.</th>
                <th>3 м.</th>
                <th>4 м.</th>
                <th>5 м.</th>
                <th>6 м.</th>
                <th>7 м.</th>
                <th>8 м.</th>
                <th>9 м.</th>
                <th>10 м.</th>
                <th>11 м.</th>
                <th>12 м.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="fw-bold text-start">Дорослі</td>
                <td>200</td><td>170</td><td>150</td><td>140</td><td>130</td><td>120</td><td>110</td><td>100</td><td>70</td><td>60</td><td>50</td><td>45</td>
              </tr>
              <tr>
                <td className="fw-bold text-start">Молодь (U23)</td>
                <td>170</td><td>150</td><td>140</td><td>130</td><td>120</td><td>110</td><td>100</td><td>70</td><td>60</td><td>50</td><td>45</td><td>40</td>
              </tr>
              <tr>
                <td className="fw-bold text-start">Юніори (U20)</td>
                <td>150</td><td>140</td><td>130</td><td>120</td><td>110</td><td>100</td><td>70</td><td>60</td><td>50</td><td>45</td><td>40</td><td>35</td>
              </tr>
              <tr>
                <td className="fw-bold text-start">Юнаки (U18, U16)</td>
                <td>140</td><td>130</td><td>120</td><td>110</td><td>100</td><td>70</td><td>60</td><td>50</td><td>45</td><td>40</td><td>35</td><td>25</td>
              </tr>
            </tbody>
          </Table>
        </div>

        <Row className="g-3">
          <Col xs={12} md={6}>
            <h6 className="fw-bold text-primary mb-2">3. Бонуси за виконання нормативів:</h6>
            <Table bordered size="sm" className="small mb-0 text-center">
              <thead className="table-light">
                <tr>
                  <th>Категорія</th>
                  <th>МСУМК</th>
                  <th>МСУ</th>
                  <th>КМСУ</th>
                  <th>I р.</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="text-start">Дорослі</td><td>100</td><td>60</td><td>30</td><td>–</td></tr>
                <tr><td className="text-start">Молодь</td><td>120</td><td>80</td><td>40</td><td>–</td></tr>
                <tr><td className="text-start">Юніори</td><td>140</td><td>100</td><td>50</td><td>–</td></tr>
                <tr><td className="text-start">Юнаки</td><td>–</td><td>120</td><td>60</td><td>20</td></tr>
              </tbody>
            </Table>
          </Col>

          <Col xs={12} md={6}>
            <h6 className="fw-bold text-primary mb-2">4. Бонуси за рекорди:</h6>
            <Table bordered size="sm" className="small mb-0 text-center">
              <thead className="table-light">
                <tr>
                  <th>Категорія</th>
                  <th>Рекорд області</th>
                  <th>Рекорд України</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="text-start">Дорослі</td><td>100</td><td>200</td></tr>
                <tr><td className="text-start">Молодь</td><td>90</td><td>180</td></tr>
                <tr><td className="text-start">Юніори</td><td>80</td><td>160</td></tr>
                <tr><td className="text-start">Юнаки</td><td>70</td><td>140</td></tr>
              </tbody>
            </Table>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" size="sm" onClick={onHide}>
          Зрозуміло
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
