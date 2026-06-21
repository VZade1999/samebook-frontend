import React from 'react';

import {
  Card,
  Timeline,
  Typography,
} from 'antd';

const { Text } = Typography;

interface Props {
  data: any[];
}

const InvoiceTimeline: React.FC<Props> = ({
  data,
}) => {
  return (
    <Card title="Timeline">
      <Timeline
        items={(data || []).map(
          (item: any) => ({
            children: (
              <>
                <Text strong>
                  {item.action}
                </Text>

                <br />

                <Text type="secondary">
                  {new Date(
                    item.created_at,
                  ).toLocaleString()}
                </Text>
                <br />
                <Text type="success">
                 Change By {
                    item?.changed_by?.first_name
                  } {item?.changed_by?.last_name}
                </Text>
              </>
            ),
          }),
        )}
      />
    </Card>
  );
};

export default InvoiceTimeline;