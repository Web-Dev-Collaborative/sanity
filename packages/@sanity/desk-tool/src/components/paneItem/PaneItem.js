import React, {useCallback, useContext} from 'react'
import PropTypes from 'prop-types'
import {Card, Text, Box} from '@sanity/ui'
import {ChevronRightIcon} from '@sanity/icons'
import schema from 'part:@sanity/base/schema'
import {SanityDefaultPreview} from 'part:@sanity/base/preview'
import folderIcon from 'part:@sanity/base/folder-icon'
import fileIcon from 'part:@sanity/base/file-icon'
import DocumentPaneItemPreview from '../../components/DocumentPaneItemPreview'
import getIconWithFallback from '../../utils/getIconWithFallback'
import MissingSchemaType from '../../components/MissingSchemaType'
import {PaneRouterContext} from '../../contexts/PaneRouterContext'

PaneItem.propTypes = {
  id: PropTypes.string.isRequired,
  layout: PropTypes.string,
  isSelected: PropTypes.bool,
  isActive: PropTypes.bool,
  icon: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  value: PropTypes.shape({
    _id: PropTypes.string,
    _type: PropTypes.string,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    media: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  }),
  schemaType: PropTypes.shape({
    name: PropTypes.string,
    icon: PropTypes.func,
  }),
}

PaneItem.defaultProps = {
  layout: 'default',
  icon: undefined,
  value: null,
  isSelected: false,
  isActive: false,
  schemaType: null,
}

export default function PaneItem(props) {
  const {id, isSelected, schemaType, layout, icon, value, isActive} = props
  const {ChildLink} = useContext(PaneRouterContext)
  const hasSchemaType = schemaType && schemaType.name && schema.get(schemaType.name)

  let preview
  if (value && value._id) {
    preview = hasSchemaType ? (
      <DocumentPaneItemPreview
        icon={getIconWithFallback(icon, schemaType, fileIcon)}
        layout={layout}
        schemaType={schemaType}
        value={value}
      />
    ) : (
      <MissingSchemaType value={value} />
    )
  } else {
    preview = (
      <SanityDefaultPreview
        status={
          <Box padding={1}>
            <Text style={{color: 'inherit', opacity: 0.75}} size={2}>
              <ChevronRightIcon />
            </Text>
          </Box>
        }
        icon={getIconWithFallback(icon, schemaType, folderIcon)}
        layout={layout}
        value={value}
      />
    )
  }

  const LinkComponent = useCallback(
    (linkProps) => {
      return <ChildLink {...linkProps} childId={id} />
    },
    [ChildLink, id]
  )

  if (isSelected && isActive) {
    return (
      <div aria-selected>
        <Card padding={2} data-as="a" radius={2}>
          {preview}
        </Card>
      </div>
    )
  }

  if (isSelected) {
    return (
      <Card padding={2} data-as="a" radius={2} selected>
        {preview}
      </Card>
    )
  }

  return (
    <Card padding={2} data-as="a" radius={2} as={LinkComponent}>
      {preview}
    </Card>
  )
}
